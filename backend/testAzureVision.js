import { extractPoWithAzureAi } from "./services/poAzureAiExtractor.js";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.log("Usage: node testAzureVision.js <path-to-pdf>");
  process.exit(1);
}

(async () => {
  const result = await extractPoWithAzureAi(pdfPath, { pages: 1, debug: true });
  console.log(JSON.stringify(result, null, 2));
})();
