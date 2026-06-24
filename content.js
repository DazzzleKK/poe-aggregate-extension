(function () {
  "use strict";

  const PANEL_ID = "acc-counter-extension-panel";
  const MAX_VISIBLE_ROWS = 20;
  const ACCOUNT_RE = /Acc:\s*([^\s#]+#\d{2,})/gu;
  const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/u;

  let lastSignature = "";

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) {
      return panel;
    }

    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-live", "polite");
    panel.style.position = "fixed";
    panel.style.left = "12px";
    panel.style.bottom = "12px";
    panel.style.zIndex = "2147483647";
    panel.style.boxSizing = "border-box";
    panel.style.width = "min(460px, calc(100vw - 24px))";
    panel.style.maxHeight = "45vh";
    panel.style.overflow = "auto";
    panel.style.padding = "10px 12px";
    panel.style.border = "1px solid rgba(255,255,255,0.16)";
    panel.style.borderRadius = "8px";
    panel.style.background = "rgba(18, 18, 20, 0.92)";
    panel.style.color = "#f5f5f5";
    panel.style.boxShadow = "0 8px 26px rgba(0,0,0,0.35)";
    panel.style.fontFamily = "Arial, Helvetica, sans-serif";
    panel.style.fontSize = "13px";
    panel.style.lineHeight = "1.35";
    panel.style.backdropFilter = "blur(8px)";

    document.documentElement.appendChild(panel);
    return panel;
  }

  function getPageText() {
    const body = document.body;
    if (!body) {
      return "";
    }

    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      return body.innerText || body.textContent || "";
    }

    const previousDisplay = panel.style.display;
    panel.style.display = "none";
    const text = body.innerText || body.textContent || "";
    panel.style.display = previousDisplay;
    return text;
  }

  function countAccounts(text) {
    const counts = new Map();
    let match;

    ACCOUNT_RE.lastIndex = 0;
    while ((match = ACCOUNT_RE.exec(text)) !== null) {
      const account = match[1];
      counts.set(account, (counts.get(account) || 0) + 1);
    }

    return Array.from(counts, ([account, count]) => ({ account, count }))
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count || a.account.localeCompare(b.account));
  }

  function hasCjkAccount(text) {
    let match;

    ACCOUNT_RE.lastIndex = 0;
    while ((match = ACCOUNT_RE.exec(text)) !== null) {
      const nickname = match[1].split("#")[0];
      if (CJK_RE.test(nickname)) {
        return true;
      }
    }

    return false;
  }

  function removeCjkRows() {
    document.querySelectorAll("div.row").forEach((row) => {
      const text = row.innerText || row.textContent || "";
      if (hasCjkAccount(text)) {
        row.remove();
      }
    });
  }

  function getFirstAccount(text) {
    ACCOUNT_RE.lastIndex = 0;
    const match = ACCOUNT_RE.exec(text);
    return match ? match[1] : null;
  }

  function getControlText(control) {
    return [
      control.innerText,
      control.textContent,
      control.value,
      control.title,
      control.getAttribute("aria-label")
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findTravelButton(row) {
    const controls = row.querySelectorAll(
      "button, a, input[type='button'], input[type='submit']"
    );

    return Array.from(controls).find((control) =>
      getControlText(control).toLowerCase().includes("travel to hideout")
    );
  }

  function getTravelButtonMap() {
    const buttonsByAccount = new Map();

    document.querySelectorAll("div.row").forEach((row) => {
      const text = row.innerText || row.textContent || "";
      const account = getFirstAccount(text);
      const travelButton = account ? findTravelButton(row) : null;

      if (account && travelButton && !buttonsByAccount.has(account)) {
        buttonsByAccount.set(account, travelButton);
      }
    });

    return buttonsByAccount;
  }

  function stylePanelButton(button) {
    button.style.cursor = "pointer";
    button.style.border = "1px solid rgba(255,255,255,0.2)";
    button.style.borderRadius = "6px";
    button.style.background = "rgba(255,255,255,0.1)";
    button.style.color = "#f5f5f5";
    button.style.padding = "4px 8px";
    button.style.font = "inherit";
  }

  function renderPanel(items, travelButtons) {
    const panel = ensurePanel();
    const signature = JSON.stringify({
      items,
      buttons: items.map((item) => travelButtons.has(item.account))
    });

    if (signature === lastSignature) {
      return;
    }

    lastSignature = signature;

    const header = document.createElement("div");
    header.style.display = "grid";
    header.style.gridTemplateColumns = "1fr auto";
    header.style.gap = "8px";
    header.style.alignItems = "center";
    header.style.marginBottom = "8px";

    const title = document.createElement("div");
    title.textContent = "Acc duplicates";
    title.style.fontWeight = "700";
    title.style.fontSize = "13px";

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.textContent = "Refresh";
    stylePanelButton(refreshButton);
    refreshButton.addEventListener("click", update);

    header.append(title, refreshButton);
    panel.replaceChildren(header);

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No repeated accounts found";
      empty.style.color = "rgba(245,245,245,0.72)";
      panel.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.style.display = "grid";
    list.style.gap = "5px";

    items.slice(0, MAX_VISIBLE_ROWS).forEach((item, index) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "24px minmax(0, 1fr) auto auto";
      row.style.gap = "8px";
      row.style.alignItems = "center";

      const rank = document.createElement("span");
      rank.textContent = String(index + 1);
      rank.style.color = "rgba(245,245,245,0.58)";

      const account = document.createElement("span");
      account.textContent = item.account;
      account.style.overflow = "hidden";
      account.style.textOverflow = "ellipsis";
      account.style.whiteSpace = "nowrap";

      const count = document.createElement("strong");
      count.textContent = String(item.count);
      count.style.color = "#ffd166";

      const travelButton = document.createElement("button");
      travelButton.type = "button";
      travelButton.textContent = "Hideout";
      travelButton.title = "Travel to Hideout";
      stylePanelButton(travelButton);

      const originalTravelButton = travelButtons.get(item.account);
      if (originalTravelButton) {
        travelButton.addEventListener("click", () => {
          originalTravelButton.click();
        });
      } else {
        travelButton.disabled = true;
        travelButton.style.cursor = "not-allowed";
        travelButton.style.opacity = "0.45";
      }

      row.append(rank, account, travelButton, count);
      list.appendChild(row);
    });

    panel.appendChild(list);

    if (items.length > MAX_VISIBLE_ROWS) {
      const more = document.createElement("div");
      more.textContent = `+${items.length - MAX_VISIBLE_ROWS} more`;
      more.style.marginTop = "7px";
      more.style.color = "rgba(245,245,245,0.58)";
      panel.appendChild(more);
    }
  }

  function update() {
    removeCjkRows();
    renderPanel(countAccounts(getPageText()), getTravelButtonMap());
  }

  update();
})();
