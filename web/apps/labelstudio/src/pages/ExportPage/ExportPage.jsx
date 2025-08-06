import { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router";
import { Button } from "../../components";
import { Form, Input } from "../../components/Form";
import { Modal } from "../../components/Modal/Modal";
import { Space } from "../../components/Space/Space";
import { useAPI } from "../../providers/ApiProvider";
import { useFixedLocation, useParams } from "../../providers/RoutesProvider";
import { BemWithSpecifiContext } from "../../utils/bem";
import { isDefined } from "../../utils/helpers";
import "./ExportPage.scss";

// const formats = {
//   json: 'JSON',
//   csv: 'CSV',
// };

const downloadFile = (blob, filename) => {
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const { Block, Elem } = BemWithSpecifiContext();

const wait = () => new Promise((resolve) => setTimeout(resolve, 5000));

export const ExportPage = () => {
  const history = useHistory();
  const location = useFixedLocation();
  const pageParams = useParams();
  const api = useAPI();

  const [previousExports, setPreviousExports] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadingMessage, setDownloadingMessage] = useState(false);
  const [availableFormats, setAvailableFormats] = useState([]);
  const [currentFormat, setCurrentFormat] = useState("JSON");
  const [gcsResult, setGcsResult] = useState(null);
  const [gcsError, setGcsError] = useState(null);

  /** @type {import('react').RefObject<Form>} */
  const form = useRef();

  const clearGcsResult = () => {
    setGcsResult(null);
    setGcsError(null);
  };

  const proceedExport = async () => {
    setDownloading(true);
    clearGcsResult();

    const message = setTimeout(() => {
      setDownloadingMessage(true);
    }, 1000);

    const params = form.current.assembleFormData({
      asJSON: true,
      full: true,
      booleansAsNumbers: true,
    });

    try {
      const response = await api.callApi("exportRaw", {
        params: {
          pk: pageParams.id,
          ...params,
        },
      });

      if (response.ok) {
        // Handle GCS export differently
        if (currentFormat === 'YOLO_WITH_IMAGES_TO_GCS') {
          const result = await response.json();
          setGcsResult(result);
        } else {
          // Regular file download
          const blob = await response.blob();
          downloadFile(blob, response.headers.get("filename"));
        }
      } else {
        // Handle error response
        if (currentFormat === 'YOLO_WITH_IMAGES_TO_GCS') {
          const errorData = await response.json();
          setGcsError(errorData.error || 'Unknown error');
        } else {
          api.handleError(response);
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      if (currentFormat === 'YOLO_WITH_IMAGES_TO_GCS') {
        setGcsError(error.message);
      } else {
        api.handleError(error);
      }
    } finally {
      setDownloading(false);
      setDownloadingMessage(false);
      clearTimeout(message);
    }
  };

  useEffect(() => {
    if (isDefined(pageParams.id)) {
      api
        .callApi("previousExports", {
          params: {
            pk: pageParams.id,
          },
        })
        .then(({ export_files }) => {
          setPreviousExports(export_files.slice(0, 1));
        });

      api
        .callApi("exportFormats", {
          params: {
            pk: pageParams.id,
          },
        })
        .then((formats) => {
          setAvailableFormats(formats);
          setCurrentFormat(formats[0]?.name);
        });
    }
  }, [pageParams]);

  return (
    <Modal
      onHide={() => {
        const path = location.pathname.replace(ExportPage.path, "");
        const search = location.search;

        history.replace(`${path}${search !== "?" ? search : ""}`);
      }}
      title="Export data"
      style={{ width: 720 }}
      closeOnClickOutside={false}
      allowClose={!downloading}
      // footer="Read more about supported export formats in the Documentation."
      visible
    >
      <Block name="export-page">
        <FormatInfo
          availableFormats={availableFormats}
          selected={currentFormat}
          onClick={(format) => setCurrentFormat(format.name)}
        />

        <Form ref={form}>
          <Input type="hidden" name="exportType" value={currentFormat} />
        </Form>

        {/* GCS Export Results */}
        {gcsResult && (
          <Elem name="gcs-result">
            <Block name="gcs-success">
              <Elem name="title">Export to GCS Completed Successfully!</Elem>
              <Elem name="summary">
                <div><strong>Storage:</strong> {gcsResult.storage_name}</div>
                <div><strong>Bucket:</strong> {gcsResult.bucket}</div>
                <div><strong>Prefix:</strong> {gcsResult.prefix || 'None'}</div>
                <div><strong>Total Files:</strong> {gcsResult.total_files}</div>
                <div><strong>Successfully Uploaded:</strong> {gcsResult.successful_uploads}</div>
                <div><strong>Failed Uploads:</strong> {gcsResult.failed_uploads}</div>
              </Elem>
              <Elem name="files">
                <div><strong>Files uploaded to:</strong></div>
                {gcsResult.upload_results.map((result, index) => (
                  <div key={index} style={{ 
                    color: result.status === 'success' ? 'green' : 'red',
                    marginLeft: '10px',
                    fontSize: '12px'
                  }}>
                    {result.status === 'success' ? '✅' : '❌'} {result.gcs_path}
                    {result.status === 'success' && result.size && (
                      <span style={{ color: 'gray' }}> ({Math.round(result.size / 1024)}KB)</span>
                    )}
                    {result.status === 'error' && result.error && (
                      <div style={{ color: 'red', marginLeft: '20px', fontSize: '11px' }}>
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </Elem>
              <Button onClick={clearGcsResult} style={{ marginTop: '10px' }}>
                Clear Results
              </Button>
            </Block>
          </Elem>
        )}

        {gcsError && (
          <Elem name="gcs-error">
            <Block name="gcs-error">
              <Elem name="title">Export to GCS Failed</Elem>
              <Elem name="error">{gcsError}</Elem>
              <Button onClick={clearGcsResult} style={{ marginTop: '10px' }}>
                Clear Error
              </Button>
            </Block>
          </Elem>
        )}

        <Elem name="footer">
          <Space style={{ width: "100%" }} spread>
            <Elem name="recent">{/* {exportHistory} */}</Elem>
            <Elem name="actions">
              <Space>
                {downloadingMessage && "Files are being prepared. It might take some time."}
                <Elem tag={Button} name="finish" look="primary" onClick={proceedExport} waiting={downloading}>
                  Export
                </Elem>
              </Space>
            </Elem>
          </Space>
        </Elem>
      </Block>
    </Modal>
  );
};

const FormatInfo = ({ availableFormats, selected, onClick }) => {
  return (
    <Block name="formats">
      <Elem name="info">You can export dataset in one of the following formats:</Elem>
      <Elem name="list">
        {availableFormats.map((format) => (
          <Elem
            key={format.name}
            name="item"
            mod={{
              active: !format.disabled,
              selected: format.name === selected,
            }}
            onClick={!format.disabled ? () => onClick(format) : null}
          >
            <Elem name="name">
              {format.title}

              <Space size="small">
                {format.tags?.map?.((tag, index) => (
                  <Elem key={index} name="tag">
                    {tag}
                  </Elem>
                ))}
              </Space>
            </Elem>

            {format.description && <Elem name="description">{format.description}</Elem>}
          </Elem>
        ))}
      </Elem>
      <Elem name="feedback">
        Can't find an export format?
        <br />
        Please let us know in{" "}
        <a className="no-go" href="https://slack.labelstud.io/?source=product-export" target="_blank" rel="noreferrer">
          Slack
        </a>{" "}
        or submit an issue to the{" "}
        <a
          className="no-go"
          href="https://github.com/HumanSignal/label-studio-converter/issues"
          target="_blank"
          rel="noreferrer"
        >
          Repository
        </a>
      </Elem>
    </Block>
  );
};

ExportPage.path = "/export";
ExportPage.modal = true;
