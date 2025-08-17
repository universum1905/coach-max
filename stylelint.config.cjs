// stylelint.config.cjs
module.exports = {
  extends: ["stylelint-config-standard"],
  rules: {
    // Lautstärke runter für Legacy-Stil
    "keyframes-name-pattern": null,
    "selector-id-pattern": null,
    "declaration-block-single-line-max-declarations": null,
    "media-feature-range-notation": null,
    "rule-empty-line-before": null,
    "at-rule-empty-line-before": null,
    "comment-empty-line-before": null,

    // Hinweise statt harte Fehler
    "shorthand-property-no-redundant-values": [true, { severity: "warning" }],
    "declaration-block-no-redundant-longhand-properties": [true, { severity: "warning" }],
    "no-descending-specificity": [true, { severity: "warning" }],

    // Echte Fehler behalten
    "no-duplicate-selectors": true,

    // Vorläufig Ruhe bei deprecated Keywords (z. B. break-word)
    "declaration-property-value-keyword-no-deprecated": null
  },
  ignoreFiles: [
    "node_modules/**",
    "public/images/**",
    "public/videos/**",
    "public/audio/**",
    "**/stylebackup*.css"
  ]
};