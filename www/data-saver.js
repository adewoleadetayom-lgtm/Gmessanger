(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    plan: 'free',
    mode: 'standard',
    autoDownloadMedia: false,
    autoPlayVideos: false,
    imageQuality: 'low',
    videoQuality: 'low',
    syncInterval: 120,
    dataUsed: 0
  };

  function getSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem('gmessengerDataSaver')
      );

      return {
        ...DEFAULT_SETTINGS,
        ...(saved || {})
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(
      'gmessengerDataSaver',
      JSON.stringify(settings)
    );
  }

  function applyPlan(plan) {
    const settings = getSettings();

    if (plan === 'paid') {
      settings.plan = 'paid';
      settings.mode = 'ultra';
      settings.autoDownloadMedia = false;
      settings.autoPlayVideos = false;
      settings.imageQuality = 'very-low';
      settings.videoQuality = 'very-low';
      settings.syncInterval = 300;
    } else {
      settings.plan = 'free';
      settings.mode = 'standard';
      settings.autoDownloadMedia = false;
      settings.autoPlayVideos = false;
      settings.imageQuality = 'low';
      settings.videoQuality = 'low';
      settings.syncInterval = 120;
    }

    saveSettings(settings);
    updateDataSaverUI();
  }

  function addDataUsage(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return;

    const settings = getSettings();
    settings.dataUsed += Math.round(bytes);
    saveSettings(settings);
    updateDataSaverUI();
  }

  function resetDataUsage() {
    const settings = getSettings();
    settings.dataUsed = 0;
    saveSettings(settings);
    updateDataSaverUI();
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';

    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }

    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function updateDataSaverUI() {
    const settings = getSettings();

    const mode = document.getElementById('gmDataMode');
    const usage = document.getElementById('gmDataUsage');
    const plan = document.getElementById('gmDataPlan');

    if (mode) {
      mode.textContent =
        settings.mode === 'ultra'
          ? 'Ultra Data Saver'
          : 'Standard Data Saver';
    }

    if (usage) {
      usage.textContent = formatBytes(settings.dataUsed);
    }

    if (plan) {
      plan.textContent =
        settings.plan === 'paid'
          ? 'Paid plan'
          : 'Free plan';
    }
  }

  function openDataSaver() {
    let panel = document.getElementById('gmDataSaverPanel');

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'gmDataSaverPanel';

      panel.innerHTML = `
        <div class="gm-data-overlay">
          <div class="gm-data-card">

            <button class="gm-data-close"
                    onclick="window.GMessengerDataSaver.close()">
              ×
            </button>

            <h2>Data Saver</h2>

            <div class="gm-data-status">
              <strong id="gmDataMode">
                Standard Data Saver
              </strong>

              <span id="gmDataPlan">
                Free plan
              </span>
            </div>

            <div class="gm-data-box">
              <div>Data recorded by G Messenger</div>
              <strong id="gmDataUsage">0 B</strong>
            </div>

            <div class="gm-data-option">
              <span>Automatic media download</span>
              <strong>OFF</strong>
            </div>

            <div class="gm-data-option">
              <span>Automatic video playback</span>
              <strong>OFF</strong>
            </div>

            <div class="gm-data-option">
              <span>Background synchronization</span>
              <strong>Reduced</strong>
            </div>

            <div class="gm-data-info">
              Paid plans use Ultra Data Saver.
              This reduces unnecessary network traffic,
              but it cannot provide internet access without
              an available network connection.
            </div>

            <button class="gm-data-reset"
                    onclick="window.GMessengerDataSaver.reset()">
              Reset usage counter
            </button>

          </div>
        </div>
      `;

      document.body.appendChild(panel);
    }

    panel.style.display = 'flex';
    updateDataSaverUI();
  }

  function closeDataSaver() {
    const panel = document.getElementById(
      'gmDataSaverPanel'
    );

    if (panel) {
      panel.style.display = 'none';
    }
  }

  function installStyles() {
    if (document.getElementById('gmDataSaverStyles')) return;

    const style = document.createElement('style');
    style.id = 'gmDataSaverStyles';

    style.textContent = `
      .gm-data-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 99999;
      }

      .gm-data-card {
        width: 100%;
        max-width: 430px;
        background: white;
        border-radius: 22px;
        padding: 24px;
        box-shadow: 0 15px 50px rgba(0,0,0,.25);
        position: relative;
      }

      .gm-data-card h2 {
        margin-top: 0;
        color: #087cff;
      }

      .gm-data-close {
        position: absolute;
        right: 15px;
        top: 12px;
        border: 0;
        background: transparent;
        font-size: 30px;
        color: #607d98;
      }

      .gm-data-status {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin: 18px 0;
      }

      .gm-data-status strong {
        color: #087cff;
        font-size: 18px;
      }

      .gm-data-status span {
        color: #78909c;
        font-size: 13px;
      }

      .gm-data-box {
        background: #f0f6ff;
        border-radius: 15px;
        padding: 17px;
        margin-bottom: 14px;
      }

      .gm-data-box strong {
        display: block;
        font-size: 25px;
        color: #087cff;
        margin-top: 6px;
      }

      .gm-data-option {
        display: flex;
        justify-content: space-between;
        gap: 15px;
        padding: 14px 0;
        border-bottom: 1px solid #edf2f7;
        font-size: 14px;
      }

      .gm-data-option strong {
        color: #087cff;
      }

      .gm-data-info {
        margin-top: 16px;
        padding: 13px;
        background: #fff8e1;
        border-radius: 12px;
        color: #6d5b00;
        font-size: 12px;
        line-height: 1.5;
      }

      .gm-data-reset {
        width: 100%;
        margin-top: 16px;
        padding: 12px;
        border: 1px solid #c9d7e8;
        background: white;
        color: #087cff;
        border-radius: 12px;
        font-weight: bold;
      }
    `;

    document.head.appendChild(style);
  }

  window.GMessengerDataSaver = {
    getSettings,
    applyPlan,
    addDataUsage,
    reset: resetDataUsage,
    open: openDataSaver,
    close: closeDataSaver,
    formatBytes
  };

  document.addEventListener('DOMContentLoaded', () => {
    installStyles();

    const settings = getSettings();

    if (settings.plan === 'paid') {
      applyPlan('paid');
    } else {
      applyPlan('free');
    }
  });

})();
