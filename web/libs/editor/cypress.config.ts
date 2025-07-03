import configure from "@humansignal/frontend-test/configure";

export default configure((config) => {
  // Only run the video regions test file
  if (config.e2e) {
    config.e2e.specPattern = "**/video/regions.cy.ts";
  }
  return config;
});
