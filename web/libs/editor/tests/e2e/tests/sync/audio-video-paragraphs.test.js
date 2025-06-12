const assert = require("assert");

Feature("Sync: Audio Video Paragraphs");

const config = `
<View>
  <Video name="video" value="$url" sync="v1" />
  <Audio name="audio" value="$url" hotkey="space" sync="v1" />
  <Header value="Sentiment"/>
  <ParagraphLabels name="label" toName="text">
    <Label value="General: Positive" background="#00ff00"/>
    <Label value="General: Negative" background="#ff0000"/>
    <Label value="Company: Positive" background="#7dff7d"/>
    <Label value="Company: Negative" background="#ff7d7d"/>
    <Label value="External: Positive" background="#4bff4b"/>
    <Label value="External: Negative" background="#ff4b4b"/>
  </ParagraphLabels>
  <View style="height: 400px; overflow-y: auto">
    <Header value="Transcript"/>
    <Paragraphs audioUrl="$url" name="text" value="$text" layout="dialogue" textKey="text" nameKey="author" showplayer="true" sync="v1" />
  </View>
</View>
`;

const data = {
  url: "/public/files/barradeen-emotional.mp3",
  text: [
    {
      end: 5.6,
      text: "Dont you hate that?",
      start: 3.1,
      author: "Mia Wallace",
    },
    {
      text: "Hate what?",
      start: 4.2,
      author: "Vincent Vega:",
      duration: 3.1,
    },
    {
      text: "Uncomfortable silences. Why do we feel its necessary to yak about nonsense in order to be comfortable?",
      author: "Mia Wallace:",
    },
    {
      text: "I dont know. Thats a good question.",
      start: 90,
      author: "Vincent Vega:",
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
    },
  ],
};

const annotations = [
  {
    value: {
      start: "0",
      end: "0",
      startOffset: 0,
      endOffset: 4,
      text: "Dont",
      paragraphlabels: ["General: Negative"],
    },
    id: "RcHv5CdYBt",
    from_name: "label",
    to_name: "text",
    type: "paragraphlabels",
    origin: "manual",
  },
  {
    value: {
      start: "0",
      end: "0",
      startOffset: 9,
      endOffset: 13,
      text: "hate",
      paragraphlabels: ["General: Positive"],
    },
    id: "eePG7PVYH7",
    from_name: "label",
    to_name: "text",
    type: "paragraphlabels",
    origin: "manual",
  },
];

const params = { annotations: [{ id: "test", result: annotations }], config, data };

Scenario(
  "Play/pause is synced between audio, video and paragraphs when interacting with paragraph interface",
  async ({ I, LabelStudio, AtAudioView, AtVideoView }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });

    I.amOnPage("/");

    LabelStudio.init(params);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    {
      I.say("Audio, Video, and Paragraph Audio are starting at 0");

      const [{ currentTime: startingParagraphAudioTime }, { currentTime: startingAudioTime }] =
        await AtAudioView.getCurrentAudio();
      const [{ currentTime: startingVideoTime }] = await AtVideoView.getCurrentVideo();

      assert.equal(startingAudioTime, startingVideoTime);
      assert.equal(startingAudioTime, startingParagraphAudioTime);
      assert.equal(startingParagraphAudioTime, 0);
    }

    I.click('[aria-label="play"]');
    I.wait(1);
    {
      I.say("Audio, Video, and Paragraph Audio are playing");

      const [{ paused: paragraphAudioPaused }, { paused: audioPaused }] = await AtAudioView.getCurrentAudio();
      const [{ paused: videoPaused }] = await AtVideoView.getCurrentVideo();

      assert.equal(
        audioPaused,
        videoPaused,
        `Audio paused=${audioPaused} and Video paused=${videoPaused} are not equal`,
      );
      assert.equal(audioPaused, paragraphAudioPaused);
      assert.equal(paragraphAudioPaused, false);
    }

    I.click('[aria-label="pause"]');
    I.wait(1);
    I.waitTicks(3);
    {
      I.say("Audio, Video and Paragraph Audio are played to the same time and are now paused");

      const [
        { currentTime: currentParagraphAudioTime, paused: paragraphAudioPaused },
        { currentTime: currentAudioTime, paused: audioPaused },
      ] = await AtAudioView.getCurrentAudio();
      const [{ currentTime: currentVideoTime, paused: videoPaused }] = await AtVideoView.getCurrentVideo();

      assert.equal(audioPaused, videoPaused);
      assert.equal(audioPaused, paragraphAudioPaused);
      assert.equal(paragraphAudioPaused, true);

      I.assertTimesInSync(
        currentAudioTime,
        currentVideoTime,
        `Audio currentTime and video currentTime to be the same. Got audio=${currentAudioTime} video=${currentVideoTime}`,
      );
      I.assertTimesInSync(
        currentAudioTime,
        currentParagraphAudioTime,
        `Audio currentTime and paragraph audio currentTime to be the same. Got audio=${currentAudioTime} paragraph audio=${currentParagraphAudioTime}`,
      );
      I.assertTimesInSync(
        currentParagraphAudioTime,
        currentVideoTime,
        `Paragraph audio currentTime and video currentTime to be the same. Got audio=${currentParagraphAudioTime} video=${currentVideoTime}`,
      );
    }
  },
);

// Scenario(
//   "Play/pause is synced between audio, video when interacting with audio interface",
//   async ({ I, LabelStudio, AtAudioView, AtVideoView }) => {
//     LabelStudio.setFeatureFlags({
//       ff_front_dev_2715_audio_3_280722_short: true,
//       fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
//     });

//     I.amOnPage("/");

//     LabelStudio.init(params);

//     await AtAudioView.waitForAudio();
//     await AtAudioView.lookForStage();

//     {
//       I.say("Audio, Video are starting at 0");

//       const [, { currentTime: currentAudioTime }] = await AtAudioView.getCurrentAudio();
//       const [{ currentTime: currentVideoTime }] = await AtVideoView.getCurrentVideo();

//       assert.equal(currentAudioTime, currentVideoTime);
//       assert.equal(currentAudioTime, 0);
//     }

//     AtAudioView.clickPlayButton();
//     I.wait(1);
//     {
//       I.say("Audio, Video are playing");

//       const [, { paused: audioPaused }] = await AtAudioView.getCurrentAudio();
//       const [{ paused: videoPaused }] = await AtVideoView.getCurrentVideo();

//       assert.equal(audioPaused, videoPaused);
//       assert.equal(audioPaused, false);
//     }

//     AtAudioView.clickPauseButton();
//     I.wait(1);
//     {
//       I.say("Audio, Video are played to the same time and are now paused");

//       const [, { currentTime: currentAudioTime, paused: audioPaused }] = await AtAudioView.getCurrentAudio();
//       const [{ currentTime: currentVideoTime, paused: videoPaused }] = await AtVideoView.getCurrentVideo();

//       assert.equal(audioPaused, videoPaused);
//       assert.equal(audioPaused, true);
//       I.assertTimesInSync(
//         currentAudioTime,
//         currentVideoTime,
//         `Audio currentTime and video currentTime drifted too far. Got audio=${currentAudioTime} video=${currentVideoTime}`,
//       );
//     }
//   },
// );

Scenario(
  "Play/pause is synced between audio, video when interacting with video interface",
  async ({ I, LabelStudio, AtAudioView, AtVideoView }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });

    I.amOnPage("/");

    LabelStudio.init(params);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    {
      I.say("Audio, Video are starting at 0");

      const [, { currentTime: currentAudioTime }] = await AtAudioView.getCurrentAudio();
      const [{ currentTime: currentVideoTime }] = await AtVideoView.getCurrentVideo();

      assert.equal(currentAudioTime, currentVideoTime);
      assert.equal(currentAudioTime, 0);
    }

    AtVideoView.clickPlayButton();
    I.wait(2);
    {
      I.say("Audio, Video are playing");

      const [, { paused: audioPaused }] = await AtAudioView.getCurrentAudio();
      const [{ paused: videoPaused }] = await AtVideoView.getCurrentVideo();

      assert.equal(audioPaused, videoPaused);
      assert.equal(audioPaused, false);
    }

    AtVideoView.clickPauseButton();
    I.wait(2);
    {
      I.say("Audio, Video are played to the same time and are now paused");

      const [, { currentTime: currentAudioTime, paused: audioPaused }] = await AtAudioView.getCurrentAudio();
      const [{ currentTime: currentVideoTime, paused: videoPaused }] = await AtVideoView.getCurrentVideo();

      assert.equal(audioPaused, videoPaused);
      assert.equal(audioPaused, true);

      I.assertTimesInSync(
        currentAudioTime,
        currentVideoTime,
        `Audio currentTime and video currentTime drifted too far. Got audio=${currentAudioTime} video=${currentVideoTime}`,
      );
    }
  },
);

Scenario(
  "Seeking is synced between audio, video when interacting with audio interface",
  async ({ I, LabelStudio, AtAudioView, AtVideoView }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });

    I.amOnPage("/");

    LabelStudio.init(params);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    {
      const [, { currentTime: startingAudioTime }] = await AtAudioView.getCurrentAudio();
      const [{ currentTime: startingVideoTime }] = await AtVideoView.getCurrentVideo();

      assert.equal(startingAudioTime, startingVideoTime);
    }

    AtAudioView.clickAt(100);
    {
      I.say("Seek by clicking on some point in the audio timeline");
      const [, { currentTime: startingAudioTime }] = await AtAudioView.getCurrentAudio();
      const [{ currentTime: startingVideoTime }] = await AtVideoView.getCurrentVideo();

      assert.equal(startingAudioTime, startingVideoTime);
    }

    AtAudioView.clickAtBeginning();
    {
      I.say("Seek to beginning by clicking on the first point in the audio timeline");
      const [, { currentTime: startingAudioTime }] = await AtAudioView.getCurrentAudio();
      const [{ currentTime: startingVideoTime }] = await AtVideoView.getCurrentVideo();

      assert.equal(startingAudioTime, startingVideoTime);
    }

    AtAudioView.clickAt(300);
    {
      I.say("Seek by clicking on some point further in the audio timeline");
      const [, { currentTime: startingAudioTime }] = await AtAudioView.getCurrentAudio();
      const [{ currentTime: startingVideoTime }] = await AtVideoView.getCurrentVideo();

      assert.equal(startingAudioTime, startingVideoTime);
    }

    AtAudioView.clickAtEnd();
    {
      I.say("Seek to end by clicking on the last point in the audio timeline");
      const [, { currentTime: startingAudioTime }] = await AtAudioView.getCurrentAudio();
      const [{ currentTime: startingVideoTime }] = await AtVideoView.getCurrentVideo();

      assert.equal(startingAudioTime, startingVideoTime);
    }

    I.click('[aria-label="play"]');
    I.wait(1);
    I.click('[aria-label="pause"]');
    I.wait(1);
    {
      I.say(
        "Seek playback from paragraph. Audio, video and paragraph audio are played to the same time and are now paused",
      );

      const [
        { currentTime: currentParagraphAudioTime, paused: paragraphAudioPaused },
        { currentTime: currentAudioTime, paused: audioPaused },
      ] = await AtAudioView.getCurrentAudio();
      const [{ currentTime: currentVideoTime, paused: videoPaused }] = await AtVideoView.getCurrentVideo();

      assert.equal(audioPaused, videoPaused);
      assert.equal(audioPaused, paragraphAudioPaused);
      assert.equal(paragraphAudioPaused, true);

      I.assertTimesInSync(
        currentAudioTime,
        currentVideoTime,
        `Audio currentTime and video currentTime to be the same. Got audio=${currentAudioTime} video=${currentVideoTime}`,
      );
      I.assertTimesInSync(
        currentAudioTime,
        currentParagraphAudioTime,
        `Audio currentTime and paragraph audio currentTime to be the same. Got audio=${currentAudioTime} paragraph audio=${currentParagraphAudioTime}`,
      );
      I.assertTimesInSync(
        currentParagraphAudioTime,
        currentVideoTime,
        `Paragraph audio currentTime and video currentTime to be the same. Got audio=${currentParagraphAudioTime} video=${currentVideoTime}`,
      );
    }
  },
);

Scenario(
  "Playback speed is synced between audio, video, paragraph audio when interacting with audio interface",
  async ({ I, LabelStudio, AtAudioView, AtVideoView }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });

    I.amOnPage("/");

    LabelStudio.init(params);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    {
      const [{ playbackRate: paragraphAudioPlaybackRate }, { playbackRate: audioPlaybackRate }] =
        await AtAudioView.getCurrentAudio();
      const [{ playbackRate: videoPlaybackRate }] = await AtVideoView.getCurrentVideo();

      assert.equal(audioPlaybackRate, paragraphAudioPlaybackRate);
      assert.equal(videoPlaybackRate, audioPlaybackRate);
      assert.equal(audioPlaybackRate, 1);
    }

    AtAudioView.clickPlayButton();
    I.wait(1); // wait for audio to start playing
    AtAudioView.setPlaybackSpeedInput(1.5);
    await AtAudioView.seePlaybackSpeed(1.5);
    {
      I.say("Changing playback speed to 1.5x for audio, video and paragraph audio during playback");
      const [{ playbackRate: paragraphAudioPlaybackRate }, { playbackRate: audioPlaybackRate }] =
        await AtAudioView.getCurrentAudio();
      const [{ playbackRate: videoPlaybackRate }] = await AtVideoView.getCurrentVideo();

      assert.equal(audioPlaybackRate, paragraphAudioPlaybackRate);
      assert.equal(videoPlaybackRate, audioPlaybackRate);
      assert.equal(audioPlaybackRate, 1.5);
    }

    I.wait(2); // wait for audio to play for a bit at 1.5x speed
    AtAudioView.setPlaybackSpeedInput(1);
    await AtAudioView.seePlaybackSpeed(1);
    {
      I.say("Changing playback speed to 1x for audio, video and paragraph audio during playback");
      const [{ playbackRate: paragraphAudioPlaybackRate }, { playbackRate: audioPlaybackRate }] =
        await AtAudioView.getCurrentAudio();
      const [{ playbackRate: videoPlaybackRate }] = await AtVideoView.getCurrentVideo();

      assert.equal(audioPlaybackRate, paragraphAudioPlaybackRate, "Audio and Paragraphs speed rate is equal");
      assert.equal(videoPlaybackRate, audioPlaybackRate, "Video and Audio speed rate is equal");
      assert.equal(audioPlaybackRate, 1, "Audio speed rate is 1");
    }

    AtAudioView.clickPauseButton();
    {
      I.say("Audio, video and paragraph audio played to the same time");
      const [_, { currentTime: currentAudioTime }] = await AtAudioView.getCurrentAudio();
      const [{ currentTime: currentVideoTime }] = await AtVideoView.getCurrentVideo();

      // Played time will be out of any Paragraphs regions and its currentTime will be 0, so don't check it
      I.assertTimesInSync(
        currentAudioTime,
        currentVideoTime,
        `Audio currentTime and video currentTime drifted too far. Got audio=${currentAudioTime} video=${currentVideoTime}`,
      );
    }
  },
);

const audioParagraphConfig = `
<View>
  <Audio name="audio" value="$url" hotkey="space" sync="text" />
  <Header value="Sentiment"/>
  <ParagraphLabels name="label" toName="text">
    <Label value="General: Positive" background="#00ff00"/>
    <Label value="General: Negative" background="#ff0000"/>
    <Label value="Company: Positive" background="#7dff7d"/>
    <Label value="Company: Negative" background="#ff7d7d"/>
    <Label value="External: Positive" background="#4bff4b"/>
    <Label value="External: Negative" background="#ff4b4b"/>
  </ParagraphLabels>
  <View style="height: 400px; overflow-y: auto">
    <Header value="Transcript"/>
    <Paragraphs audioUrl="$url" contextscroll="true" sync="audio" name="text" value="$text" layout="dialogue" textKey="text" nameKey="author" showplayer="true" />
  </View>
</View>
`;

const configWithScroll = `
<View>
    <Audio name="audio" value="$url"
           hotkey="space" sync="text"/>
    <Header value="Transcript"/>
    <Paragraphs audioUrl="$url"
                sync="audio"
                name="text"
                value="$text"
                layout="dialogue"
                textKey="text"
                nameKey="author"
                contextscroll="true"
                granularity="paragraph"/>
     <View style="position: sticky">
      <Header value="Sentiment Labels"/>
      <ParagraphLabels name="label" toName="text">
        <Label value="General: Positive" background="#00ff00"/>
        <Label value="General: Negative" background="#ff0000"/>
        <Label value="Company: Positive" background="#7dff7d"/>
        <Label value="Company: Negative" background="#ff7d7d"/>
        <Label value="External: Positive" background="#4bff4b"/>
        <Label value="External: Negative" background="#ff4b4b"/>
      </ParagraphLabels>
    </View>
</View>
`;

const audioParagraphData = {
  url: "/public/files/barradeen-emotional.mp3",
  text: [
    {
      end: 3,
      text: "Dont you hate that?",
      start: 1,
      author: "Mia Wallace",
    },
    {
      text: "Hate what?",
      start: 3,
      author: "Vincent Vega:",
      duration: 1,
    },
    {
      text: "Uncomfortable silences. Why do we feel its necessary to yak about nonsense in order to be comfortable?",
      author: "Mia Wallace:",
      start: 4,
      end: 6,
    },
    {
      text: "I dont know. Thats a good question.",
      start: 6,
      end: 8,
      author: "Vincent Vega:",
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
      start: 8,
      end: 10,
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
      start: 10,
      end: 12,
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
      start: 12,
      end: 14,
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
      start: 14,
      end: 16,
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
      start: 16,
      end: 18,
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
      start: 18,
      end: 20,
    },
  ],
};

const audioParagraphAnnotations = [
  {
    value: {
      start: "0",
      end: "0",
      startOffset: 0,
      endOffset: 4,
      text: "Dont",
      paragraphlabels: ["General: Negative"],
    },
    id: "RcHv5CdYBt",
    from_name: "label",
    to_name: "text",
    type: "paragraphlabels",
    origin: "manual",
  },
  {
    value: {
      start: "0",
      end: "0",
      startOffset: 9,
      endOffset: 13,
      text: "hate",
      paragraphlabels: ["General: Positive"],
    },
    id: "eePG7PVYH7",
    from_name: "label",
    to_name: "text",
    type: "paragraphlabels",
    origin: "manual",
  },
];

const audioParagraphParams = {
  annotations: [{ id: "test", result: audioParagraphAnnotations }],
  config: audioParagraphConfig,
  data: audioParagraphData,
};

Scenario(
  "Audio clip is played when selecting the play button next to a paragraph segment",
  async ({ I, LabelStudio, AtAudioView, AtOutliner }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });

    I.amOnPage("/");

    LabelStudio.init(audioParagraphParams);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    AtOutliner.seeRegions(2);

    const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] =
      await AtAudioView.getCurrentAudio();

    assert.equal(startingAudioTime, startingParagraphAudioTime);
    assert.equal(startingParagraphAudioTime, 0);

    I.click('[aria-label="play"]');
    I.wait(1);

    I.click('[aria-label="play"]');
    I.wait(1);

    const [{ currentTime: seekAudioTime }, { currentTime: seekParagraphAudioTime }] =
      await AtAudioView.getCurrentAudio();

    assert.notEqual(seekAudioTime, 0);
    I.assertTimesInSync(
      seekAudioTime,
      seekParagraphAudioTime,
      `Expected seek time to be ${seekAudioTime} but was ${seekParagraphAudioTime}`,
    );
  },
);

Scenario(
  "Playback button states continually change over time according to the paragraph segment which is being played",
  async ({ I, LabelStudio, AtAudioView, AtOutliner }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });

    I.amOnPage("/");

    LabelStudio.init(audioParagraphParams);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    AtOutliner.seeRegions(2);

    const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] =
      await AtAudioView.getCurrentAudio();

    assert.equal(startingAudioTime, startingParagraphAudioTime);
    assert.equal(startingParagraphAudioTime, 0);

    AtAudioView.clickPauseButton();

    // Plays the first paragraph segment when the audio interface is played
    I.seeElement('[data-testid="phrase:0"] [aria-label="pause"]');
    I.seeElement('[data-testid="phrase:1"] [aria-label="play"]');
    I.seeElement('[data-testid="phrase:2"] [aria-label="play"]');
    I.seeElement('[data-testid="phrase:3"] [aria-label="play"]');
    I.seeElement('[data-testid="phrase:4"] [aria-label="play"]');

    I.wait(2);

    // Plays the second paragraph segment when the audio progresses to the second paragraph segment
    I.seeElement('[data-testid="phrase:1"] [aria-label="pause"]');
    I.seeElement('[data-testid="phrase:0"] [aria-label="play"]');
    I.seeElement('[data-testid="phrase:2"] [aria-label="play"]');
    I.seeElement('[data-testid="phrase:3"] [aria-label="play"]');
    I.seeElement('[data-testid="phrase:4"] [aria-label="play"]');

    I.wait(2);

    // Plays the third paragraph segment when the audio progresses to the third paragraph segment
    I.seeElement('[data-testid="phrase:2"] [aria-label="pause"]');
    I.seeElement('[data-testid="phrase:0"] [aria-label="play"]');
    I.seeElement('[data-testid="phrase:1"] [aria-label="play"]');
    I.seeElement('[data-testid="phrase:3"] [aria-label="play"]');
    I.seeElement('[data-testid="phrase:4"] [aria-label="play"]');
  },
);

Scenario(
  "Check if paragraph is scrolling automatically following the audio",
  async ({ I, LabelStudio, AtAudioView }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });

    audioParagraphParams.config = configWithScroll;

    I.amOnPage("/");

    LabelStudio.init(audioParagraphParams);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] =
      await AtAudioView.getCurrentAudio();

    assert.equal(startingAudioTime, startingParagraphAudioTime);
    assert.equal(startingParagraphAudioTime, 0);

    AtAudioView.clickPlayButton();

    I.wait(10);
    // Plays the first paragraph segment when the audio interface is played
    const scrollPosition = await I.executeScript((selector) => {
      const element = document.querySelector(selector);

      return {
        scrollTop: element.scrollTop,
        scrollLeft: element.scrollLeft,
      };
    }, '[data-testid="phrases-wrapper"]');

    await assert(scrollPosition.scrollTop > 200, "Scroll position should be greater than 200");
  },
);

Scenario(
  "Paragraph should automatically scroll if user seeks audio player",
  async ({ I, LabelStudio, AtAudioView }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });

    audioParagraphParams.config = configWithScroll;

    I.amOnPage("/");

    LabelStudio.init(audioParagraphParams);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] =
      await AtAudioView.getCurrentAudio();

    assert.equal(startingAudioTime, startingParagraphAudioTime);
    assert.equal(startingParagraphAudioTime, 0);

    AtAudioView.clickPlayButton();

    I.wait(10);

    AtAudioView.clickAtBeginning();

    I.wait(1);

    AtAudioView.clickPauseButton();

    I.wait(1);

    const scrollPosition = await I.executeScript((selector) => {
      const element = document.querySelector(selector);

      return {
        scrollTop: element.scrollTop,
        scrollLeft: element.scrollLeft,
      };
    }, '[data-testid="phrases-wrapper"]');

    await assert.equal(scrollPosition.scrollTop, 0);
  },
);

Scenario(
  "Paragraph shouldnt automatically scroll if user disable the auto-scroll toggle",
  async ({ I, LabelStudio, AtAudioView }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });

    audioParagraphParams.config = configWithScroll;

    I.amOnPage("/");

    LabelStudio.init(audioParagraphParams);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] =
      await AtAudioView.getCurrentAudio();

    assert.equal(startingAudioTime, startingParagraphAudioTime);
    assert.equal(startingParagraphAudioTime, 0);

    I.click('[data-testid="auto-scroll-toggle"]');

    AtAudioView.clickPlayButton();

    I.wait(10);

    const scrollPosition = await I.executeScript((selector) => {
      const element = document.querySelector(selector);

      return {
        scrollTop: element.scrollTop,
        scrollLeft: element.scrollLeft,
      };
    }, '[data-testid="phrases-wrapper"]');

    await assert.equal(scrollPosition.scrollTop, 0);
  },
);

Scenario(
  "Paragraph shouldnt automatically scroll if user manually scroll and the current paragraph is not in the screen",
  async ({ I, LabelStudio, AtAudioView }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });

    audioParagraphParams.config = configWithScroll;

    I.amOnPage("/");

    LabelStudio.init(audioParagraphParams);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] =
      await AtAudioView.getCurrentAudio();

    assert.equal(startingAudioTime, startingParagraphAudioTime);
    assert.equal(startingParagraphAudioTime, 0);

    AtAudioView.clickPlayButton();

    I.wait(2);
    I.waitTicks(3);

    I.executeScript(() => {
      document.querySelector('[data-testid="phrases-wrapper"]').scrollTo(0, 1000);

      const wheelEvt = document.createEvent("MouseEvents");

      wheelEvt.initEvent("wheel", true, true);

      wheelEvt.deltaY = 1200;

      document.querySelector('[data-testid="phrases-wrapper"]').dispatchEvent(wheelEvt);
    });

    I.wait(5);

    const scrollPosition = await I.executeScript((selector) => {
      const element = document.querySelector(selector);

      return {
        scrollTop: element.scrollTop,
        scrollLeft: element.scrollLeft,
      };
    }, '[data-testid="phrases-wrapper"]');

    await assert(scrollPosition.scrollTop > 400, "Scroll position should be greater than 200");
  },
);
