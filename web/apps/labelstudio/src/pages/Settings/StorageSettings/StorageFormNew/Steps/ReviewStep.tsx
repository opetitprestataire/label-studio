export const ReviewStep = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Ready to Connect</h2>
        <p className="text-gray-600 mt-1">Review your connection details and confirm to start importing</p>
      </div>

      {/* Connection Details Section */}
      <div className="grid grid-cols-2 gap-y-4 mb-8">
        <div>
          <p className="text-sm text-gray-500">Provider</p>
          <p className="font-medium">Amazon S3</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Bucket</p>
          <p className="font-medium">asdfasdf</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Files to import</p>
          <p className="font-medium">1247 files</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Total size</p>
          <p className="font-medium">2.3 GB</p>
        </div>
      </div>

      {/* Import Process Section */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Import Process</h3>
        <p className="text-blue-700">
          Files will be imported in the background. You can continue working while the import is in progress.
        </p>
      </div>
    </div>
  );
}; 