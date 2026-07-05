import { log } from "../infra/log.js";
import {
  ensureChrome,
  ensureChromePage,
  activateChromePage,
} from "welm-cdp/chrome";
import { waitElementAppear, waitElementDisappear } from "welm-cdp/dom";
import { fillText } from "welm-cdp/input";
import { click } from "welm-cdp/mouse";
import { readClipboardText } from "welm-cdp/clipboard";

const TEXTAREA_SELECTOR = "#prompt-textarea";
const SEND_BUTTON_SELECTOR = '[data-testid="send-button"]';
const STOP_BUTTON_SELECTOR = '[data-testid="stop-button"]';
const COPY_BUTTON_SELECTOR = '[data-testid="copy-turn-action-button"]';

const chatgpt_url = "https://chatgpt.com";
const temporary_chat_url = "https://chatgpt.com/?temporary-chat=true";

export async function ask(prompt, options = {}) {
  const reporter = options.reporter;
  const replyTimeout = options.replyTimeout ?? 120000;
  const replyPollDelay = options.replyPollDelay ?? 3000;
  const replySettleDelay = options.replySettleDelay ?? 1000;
  const clipboardSettleDelay = options.clipboardSettleDelay ?? 1000;
  const url = options.temporaryChat ? temporary_chat_url : chatgpt_url;

  const { targetId } = await ensureChatGP(url, options);

  // 等待输入框出现
  await waitElementAppear(targetId, TEXTAREA_SELECTOR, options);

  // 写入
  reporter?.progress?.("Preparing prompt...", options);
  await fillText(targetId, TEXTAREA_SELECTOR, prompt, options);

  // 提交
  reporter?.progress?.("Submitting prompt...", options);
  await click(targetId, SEND_BUTTON_SELECTOR, options);
  await click(targetId, TEXTAREA_SELECTOR, options);

  // 等待回复
  const replyStartTime = Date.now();

  reporter?.progress?.("Waiting for reply...", options);
  await waitElementAppear(targetId, STOP_BUTTON_SELECTOR, options);

  // 回复刚开始时通常不会立刻结束，延迟轮询以减少无意义检查
  await sleep(replyPollDelay);

  await waitElementDisappear(targetId, STOP_BUTTON_SELECTOR, {
    ...options,
    timeout: replyTimeout,
  });

  const replyElapsed = ((Date.now() - replyStartTime) / 1000).toFixed(1);
  reporter?.progressDone?.(`Reply is ready (${replyElapsed}s)`, options);

  // 复制回复前，等待回复 DOM / copy 按钮稳定
  await sleep(replySettleDelay);

  // 点击“复制回复”
  reporter?.progress?.("Copying reply...", options);
  await click(targetId, COPY_BUTTON_SELECTOR, {
    ...options,
    nth: -1,
  });

  // 点击“复制回复”后，等待系统剪贴板写入完成
  await sleep(clipboardSettleDelay);

  // 读取剪切板内容
  reporter?.progress?.("Reading reply from clipboard...", options);
  const answer = await readClipboardText();

  reporter?.progressDone?.("Reply copied", options);

  return answer;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureChatGP(url, options = {}) {
  await ensureChrome(options);

  const target = await ensureChromePage(url, options);
  await activateChromePage(target.targetId, options);
  return target;
}
