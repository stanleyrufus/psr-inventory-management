import "dotenv/config";
import axios from "axios";

const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-06-01";

if (!endpoint || !deployment || !apiKey) {
  throw new Error("Missing AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_DEPLOYMENT / AZURE_OPENAI_API_KEY");
}

const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

(async () => {
  try {
    const resp = await axios.post(
      url,
      {
        messages: [
          { role: "system", content: "Reply with OK only." },
          { role: "user", content: "Say OK." },
        ],
        max_tokens: 20,
        temperature: 0,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        timeout: 60000,
      }
    );

    console.log("STATUS:", resp.status);
    console.log("TEXT:", resp.data?.choices?.[0]?.message?.content);
  } catch (err) {
    console.log("FAILED");
    console.log("URL:", url);

    if (err.response) {
      console.log("STATUS:", err.response.status);
      console.log("DATA:", err.response.data);
    } else {
      console.log(err.message);
    }
  }
})();
