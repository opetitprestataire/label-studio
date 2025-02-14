import type { WaveformAudio } from "../Media/WaveformAudio";
import type { Waveform } from "../Waveform";
import { Player } from "./Player";
import { runInAction } from "mobx";
import { globalSyncEmitter } from "./globalSyncEmitter";

export class WebAudioPlayer extends Player {
	private audioContext?: AudioContext;
	private audioBufferSource?: AudioBufferSourceNode;
	private gainNode?: GainNode;
	// Track whether this instance is acting as the master clock.
	private isMaster = false;

	constructor(wf: Waveform, isMaster = false) {
		super(wf);
		this.isMaster = isMaster;
		this.audioContext = new AudioContext();
		this.gainNode = this.audioContext.createGain();
		this.gainNode.connect(this.audioContext.destination);

		// For slave players, subscribe to global sync updates.
		if (!this.isMaster) {
			globalSyncEmitter.on("sync", this.handleGlobalSync);
		}
	}

	async init(audio: WaveformAudio) {
		super.init(audio);
		if (!this.audioContext) return;
		if (this.audioContext.state === "suspended") {
			await this.audioContext.resume();
		}
	}

	get rate() {
		if (
			this.audioBufferSource?.playbackRate &&
			this._rate !== this.audioBufferSource.playbackRate.value
		) {
			this.audioBufferSource.playbackRate.value = this._rate;
		}
		return this._rate;
	}

	set rate(value: number) {
		const rateChanged = this._rate !== value;
		this._rate = value;
		if (rateChanged) {
			if (this.audioBufferSource?.playbackRate) {
				this.audioBufferSource.playbackRate.value = this._rate;
			}
			runInAction(() => {
				this.wf.invoke("rateChanged", [value]);
			});
		}
	}

	protected adjustVolume(): void {
		if (this.gainNode) {
			this.gainNode.gain.value = this.volume;
		}
	}

	destroy() {
		super.destroy();
		if (this.audioContext) {
			this.audioContext.close().finally(() => {
				delete this.audioContext;
			});
		}
		// Unsubscribe from global sync events if needed.
		if (!this.isMaster) {
			globalSyncEmitter.off("sync", this.handleGlobalSync);
		}
	}

	/**
	 * In playAudio, after starting playback, we call handlePlayed() so that the base class
	 * knows playback has begun. If this player is not already master, we promote it to master
	 * (unsubscribe from global sync and start its watch loop).
	 */
	protected playAudio(start?: number, _duration?: number) {
		if (!this.audioBufferSource) return;

		// If this player is not master, promote it.
		if (!this.isMaster) {
			this.isMaster = true;
			globalSyncEmitter.off("sync", this.handleGlobalSync);
		}

		try {
			if (start !== undefined) {
				this.audioBufferSource.start(0, start);
			} else {
				this.audioBufferSource.start(0);
			}
		} catch (err: any) {
			if (err.name !== "InvalidStateError") throw err;
		}
		this.timestamp = performance.now();
		this.handlePlayed();
		// As master, run the watch loop to continuously update time.
		if (this.isMaster) {
			this.watch();
		}
	}

	/**
	 * Override pause() so that after stopping playback, we call handlePaused().
	 */
	pause() {
		if (this.isDestroyed || !this.playing || !this.audio) return;
		this.stopWatch();
		this.disconnectSource();
		this.playing = false;
		this.loop = null;
		runInAction(() => {
			this.wf.invoke("pause");
			this.wf.invoke("seek", [this.currentTime]);
		});
		this.handlePaused();
	}

	protected connectSource() {
		if (
			this.isDestroyed ||
			!this.audioContext ||
			!this.audio?.buffer ||
			!this.gainNode ||
			this.connected
		)
			return;
		this.connected = true;
		this.audioBufferSource = this.audioContext.createBufferSource();
		this.audioBufferSource.buffer = this.audio.buffer;
		this.audioBufferSource.connect(this.gainNode);
		this.audioBufferSource.onended = this.handleEnded;
		if (this.audioBufferSource.playbackRate) {
			this.audioBufferSource.playbackRate.value = this._rate;
		}
	}

	protected disconnectSource(): boolean {
		if (this.isDestroyed || !this.connected || !this.audioBufferSource)
			return false;
		this.connected = false;
		try {
			this.audioBufferSource.stop();
		} catch (err: any) {
			if (err.name !== "InvalidStateError") throw err;
		}
		this.audioBufferSource.disconnect();
		this.audioBufferSource.onended = null;
		this.audioBufferSource = undefined;
		return true;
	}

	protected playSource(start?: number, end?: number) {
		this.disconnectSource();
		super.playSource(start, end);
	}

	protected updateCurrentSourceTime(timeChanged: boolean) {
		if (timeChanged && this.audioBufferSource) {
			this.disconnectSource();
			this.connectSource();
			try {
				this.audioBufferSource.start(0, this.time);
			} catch (err: any) {
				if (err.name !== "InvalidStateError") throw err;
			}
			runInAction(() => {
				this.wf.invoke("playing", [this.time]);
			});
		}
	}

	protected cleanupSource() {
		super.cleanupSource();
		this.audioBufferSource = undefined;
	}

	/**
	 * The master player's watch loop updates its own time and then emits a global sync event.
	 */
	protected watch = () => {
		if (!this.playing) return;
		this.updateCurrentTime();
		runInAction(() => {
			this.wf.invoke("playing", [this.time]);
		});
		// Emit the current time to all slave players.
		globalSyncEmitter.emit("sync", this.time);
		this.timer = requestAnimationFrame(this.watch);
	};

	/**
	 * Slave players subscribe to global sync events. When they receive an update,
	 * they update their internal time and UI.
	 */
	private handleGlobalSync = (time: number) => {
		if (!this.isMaster && this.playing) {
			this.time = time;
			runInAction(() => {
				this.wf.invoke("playing", [this.time]);
			});
		}
	};

	private updateCurrentTime() {
		const now = performance.now();
		const tick = ((now - this.timestamp) / 1000) * this.rate;
		this.timestamp = now;
		const end = this.loop?.end ?? this.duration;
		const newTime = this.time + tick;
		this.time = newTime > end ? end : newTime;
	}
}
