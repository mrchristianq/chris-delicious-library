/***********************
 * Menu.gs
 * Single spreadsheet menu entrypoint.
 *
 * This is the ONLY Apps Script file that should define onOpen()
 * and safeCall_().
 ***********************/

function onOpen() {
  safeCall_("addTmdbMenu_", typeof addTmdbMenu_ === "function" ? addTmdbMenu_ : null);
  safeCall_("addMoviesMenu_", typeof addMoviesMenu_ === "function" ? addMoviesMenu_ : null);
  safeCall_("addIgdbMenu_", typeof addIgdbMenu_ === "function" ? addIgdbMenu_ : null);
  safeCall_("addBooksMenu_", typeof addBooksMenu_ === "function" ? addBooksMenu_ : null);
  safeCall_("addBooksDebugMenu_", typeof addBooksDebugMenu_ === "function" ? addBooksDebugMenu_ : null);
}

function onInstall(e) {
  onOpen(e);
}

function safeCall_(name, fn) {
  try {
    if (typeof fn === "function") {
      fn();
    } else {
      console.log(name + " not found (function missing).");
    }
  } catch (err) {
    console.log(name + " failed: " + (err && err.message ? err.message : err));
  }
}
