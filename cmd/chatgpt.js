import { ask } from "../flow/chatgpt.js";

export const CHATGPT_COMMANDS = {
  ask: {
    handler: cmd_ask,
    usage: "chatgpt ask [options]",
    description: "Ask a question to ChatGPT ",
    options: [
      "--temporary-chat: Use temporary chat mode (default: false)",
      "--reply-timeout: Timeout for waiting for reply (default: 120000ms)",
      "--reply-poll-delay: Delay between polling for reply (default: 3000ms)",
      "--reply-settle-delay: Delay after reply is ready before copying (default: 1000ms)",
      "--clipboard-settle-delay: Delay after copying before reading clipboard (default: 1000ms)",
    ],
  },
};

async function cmd_ask({ argv, options } = {}) {
  const [prompt] = argv;
  const reporter = options.reporter;

  const answer = await ask(prompt, options);

  // 处理回复
  const lines = answer.trim().split("\n");
  let summary = lines[0];

  if (lines.length > 3) {
    reporter?.info?.(lines[0], options);
    reporter?.info?.(lines[1], options);
    reporter?.info?.(lines[2] + "...", options);
  } else if (lines.length > 2) {
    reporter?.info?.(lines[0], options);
    reporter?.info?.(lines[1] + "...", options);
  } else if (lines.length > 1) {
    reporter?.info?.(lines[0] + "...", options);
  } else {
    reporter?.info?.(lines[0], options);
  }

  return answer;
}
