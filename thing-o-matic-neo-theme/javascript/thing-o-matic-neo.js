/* ============================================================================
   THING-O-MATIC NEO  ·  tab title + favicon
   Drop this file into Forge's  javascript/  folder (next to the other .js
   files). Forge auto-loads every .js in there — no Python edits, no restart
   args needed. Hard-refresh (Ctrl+F5) after adding it.

   It sets the browser-tab title to the Thing-o-Matic wordmark and swaps in
   the gold oracle-bulb favicon (embedded below as an SVG data URI, so there's
   no separate image file to manage). Pairs with user.css.

   TO REVERT: delete this file and hard-refresh.
   ============================================================================ */
(function () {
  "use strict";

  var TITLE = "\u25CE Thing-o-Matic Neo";   // ◎ + wordmark

  // The gold oracle bulb — same mark as favicon.svg, inlined so it's portable.
  var SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<defs>' +
        '<radialGradient id="b" cx="42%" cy="38%" r="65%">' +
          '<stop offset="0%" stop-color="#ffe9a8"/>' +
          '<stop offset="52%" stop-color="#f4d160"/>' +
          '<stop offset="100%" stop-color="#d4972b"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<rect width="64" height="64" rx="13" fill="#0a0a0c"/>' +
      '<circle cx="32" cy="28" r="21" fill="#f4d160" opacity="0.14"/>' +
      '<circle cx="32" cy="28" r="15" fill="none" stroke="#d4af37" stroke-width="3"/>' +
      '<circle cx="32" cy="28" r="7.5" fill="url(#b)"/>' +
      '<circle cx="29" cy="25" r="2.1" fill="#fff6d8" opacity="0.92"/>' +
      '<rect x="26.5" y="44.5" width="11" height="3.6" rx="1.4" fill="#8a5a12"/>' +
      '<rect x="28" y="48.6" width="8" height="3.2" rx="1.4" fill="#8a5a12"/>' +
      '<rect x="29.6" y="52.2" width="4.8" height="3" rx="1.4" fill="#5e3a0a"/>' +
    '</svg>';

  var HREF = "data:image/svg+xml," + encodeURIComponent(SVG);

  function apply() {
    if (document.title !== TITLE) document.title = TITLE;

    var links = document.querySelectorAll("link[rel~='icon'], link[rel='shortcut icon']");
    if (links.length === 0) {
      var link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = HREF;
      document.head.appendChild(link);
    } else {
      links.forEach(function (l) {
        l.type = "image/svg+xml";
        if (l.getAttribute("href") !== HREF) l.setAttribute("href", HREF);
      });
    }
  }

  apply();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  }
  // Gradio can rewrite the title/favicon after boot — re-assert briefly.
  var n = 0;
  var iv = setInterval(function () { apply(); if (++n > 24) clearInterval(iv); }, 500);
})();
