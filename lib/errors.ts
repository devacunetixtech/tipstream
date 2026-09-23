const includesAny = (value: string, fragments: string[]) => fragments.some((fragment) => value.includes(fragment));

export function friendlyWalletError(error: unknown, action = "complete this transaction") {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (includesAny(message, ["user rejected", "user denied", "rejected the request", "4001"])) {
    return "You declined the request in your wallet. No transaction was sent.";
  }
  if (includesAny(message, ["insufficient funds", "exceeds the balance"])) {
    return "Your wallet does not have enough BOT for this payment and its network fee.";
  }
  if (includesAny(message, ["chain mismatch", "wrong network", "unsupported chain", "switch chain"])) {
    return "Switch your wallet to BOT Chain testnet and try again.";
  }
  if (includesAny(message, ["invalidrecipient", "invalid recipient"])) {
    return "The recipient must be a different wallet from yours.";
  }
  if (includesAny(message, ["nothingtowithdraw", "nothing to withdraw"])) {
    return "There is no BOT available to withdraw yet.";
  }
  if (includesAny(message, ["streamalreadyended", "already ended"])) {
    return "This stream has already ended and can no longer be canceled.";
  }
  if (includesAny(message, ["streamalreadycanceled", "already canceled"])) {
    return "This stream has already been canceled.";
  }
  if (includesAny(message, ["unauthorized", "not authorized"])) {
    return "This wallet is not allowed to perform that action.";
  }
  if (includesAny(message, ["failed to fetch", "network error", "timeout"])) {
    return "BOT Chain is taking too long to respond. Check your connection and try again.";
  }
  return `We could not ${action}. Your funds have not moved. Please try again.`;
}
