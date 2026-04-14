import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

export async function sendToN8n(payload) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const username = process.env.N8N_BASIC_AUTH_USER;
  const password = process.env.N8N_BASIC_AUTH_PASS;

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`n8n request failed: ${response.status} ${text}`);
  }

  return await response.text();
}
