[![DeepSource](https://app.deepsource.com/gh/ankaboot-source/wikiadviser.svg/?label=code+coverage&show_trend=true&token=ZTDAa-DQcTJvNvMiXJlquOHn)](https://app.deepsource.com/gh/ankaboot-source/wikiadviser/)
[![Maintainability](https://qlty.sh/badges/612e2b1b-61ab-468f-a868-fc13e0ec47f1/maintainability.svg)](https://qlty.sh/gh/ankaboot-source/projects/wikiadviser)

<div>
  <div align="center">
    <img width="90" height="90" src="https://github.com/ankaboot-source/wikiadviser/raw/main/docs/assets/icons/logo%20with%20background.svg" alt="WikiAdviser Logo">
  </div>
  <h1 align="center">WikiAdviser</h1>
  <div align="center">
    <p>
    Write, edit, and review articles together in real time
    </p>
  </div>
</div>

## 📑 Table of Contents
- [🤔 What is WikiAdviser?](#-what-is-wikiadviser)
- [🛠️ Setting Up](#️-setting-up)
- [🤝 Contributing](#-contributing)
- [🔧 Support](#-support)
- [📜 License](#-license)

## 🤔 What is WikiAdviser?

**WikiAdviser** is a **real-time** **collaborative** platform built on **MediaWiki**, designed for seamless article **writing**, **editing**, and **reviewing**. It enables multiple users to work together efficiently, ensuring high-quality content through instant feedback and structured revisions.

To give it a try without the hassle of installation, [simply use wikiadviser.io](https://app.wikiadviser.io/).
To run it locally, jump to [🛠️ Setting Up](#️-setting-up).
For development purposes, read [CONTRIBUTING.md](CONTRIBUTING.md).

## 🛠️ Setting Up

### Pre-requisites

- Clone the repository
- [Install Docker](https://docs.docker.com/engine/install) <details><summary><b>💡 Tip: </b>We recommend to run Docker as user, so don't forget to add your user to docker group these commands: </summary>
   sudo usermod -aG docker $USER && newgrp docker
</details>

- [Install NodeJS](https://nodejs.org)

### WikiAdviser installation

##
> [!WARNING]
> 1. Make sure port 8080 and 9000 are free before installing Wikiadviser
> 2. Edge functions runs in the foreground, Keep the terminal open to ensure the service continues running.

```sh
git clone https://github.com/ankaboot-source/wikiadviser.git
cd wikiadviser/
./start.sh
```

<details>
<summary><h4>Mediawiki Configuration</h4></summary>
  
## 
### Common.js & Common.css (Required)
- Common.js and Common.css are pages which influence the interface and layout of Wikipedia.
- You can import our custom files below into your mediawiki instance

    - <details> <summary> common.css [EN] </summary>

      ```css
      /* Hide "Notice" popup */
      .oo-ui-widget.oo-ui-widget-enabled.oo-ui-labelElement.oo-ui-floatableElement-floatable.oo-ui-popupWidget-anchored.oo-ui-popupWidget.oo-ui-popupTool-popup.oo-ui-popupWidget-anchored-top {
        display: none !important;
      }
      /* Hide "Notice" button in toolbar */
      .ve-ui-toolbar-group-notices {
        display: none !important;
      }
      /* Hide "Warning to log in" in edit source */
      .mw-message-box-warning.mw-anon-edit-warning.mw-message-box {
        display: none !important;
      }
      /* Hide "Search bar" in edit source */
      .vector-search-box-vue.vector-search-box-collapses.vector-search-box-show-thumbnail.vector-search-box-auto-expand-width.vector-search-box {
        display: none !important;
      }
      /* Hide footer-places */
      #footer-places {
        display: none !important;
      }
      /* Hide header */
      .mw-header {
        display: none !important;
      }
      /* Keep sticky header's title & TOC */
      .vector-sticky-header-end,
      .vector-sticky-header-start > :not(.vector-sticky-header-context-bar) {
        display: none !important;
      }
      .vector-sticky-header-context-bar {
        border-left: none !important;
      }
      /* Hide Menu */
      .vector-main-menu-landmark {
        display: none !important;
      }
      /* Hide right bar (Tools) */
      .vector-column-end {
        display: none !important;
      }
      /* Hide "Add Languages" button */
      #p-lang-btn {
        display: none !important;
      }
      /* Hide fullscreen button */
      #p-dock-bottom {
        display: none !important;
      }
      /* Hide save dialog's licence */
      .ve-ui-mwSaveDialog-foot {
        display: none !important;
      }
      /* Keep "Comment" Label */
      .oo-ui-tool-name-comment > a {
        padding-top: 11px !important;
      }
      .oo-ui-tool-name-comment > a > .oo-ui-tool-title {
        display: block !important;
        padding-bottom: 11px !important;
        padding-right: 11px !important;
      }
      /* Hide user guide & feedback in "?" */
      .oo-ui-tool-name-mwFeedbackDialog.oo-ui-tool-name-mwUserGuide {
        display: none !important;
      }
      /* Hide some of "Help" elements */
      .oo-ui-tool-name-mwUserGuide,
      .oo-ui-tool-name-mwFeedbackDialog {
        display: none !important;
      }
      /* Hide Edit section that is next to each paragraph title */
      .mw-editsection {
        display: none !important;
      }
      /* Hide toolbar */
      .vector-page-toolbar {
        display: none !important;
      }
      ```

      </details>

    - <details> <summary> common.css [FR] </summary>

      ```css
      /**
      * Cette page contrôle l'apparence pour tous les skins. Les
      * modifications devant s'appliquer à l'apparence Monobook
      * seulement doivent aller dans [[MediaWiki:Monobook.css]].
      *
      * Si vos modifications s'appliquent aussi à la version mobile du site,
      * pensez à aussi mettre à jour [[MediaWiki:Mobile.css]].
      */

      /* <nowiki> */

      /* Aspect des tags de filtrage dans les modifications récentes. */
      .mw-tag-markers {
        font-style: italic;
        font-size: 90%;
      }

      /* Redirections sur [[Special:AllPages]], [[Special:PrefixIndex]] et [[Special:EditWatchlist]]. */
      :is(.allpagesredirect, .watchlistredir) > .mw-redirect {
        color: #0b0;
      }

      /* Révisions dans l'historique et "(← liens)" dans les pages liées. */
      .history-size,
      .mw-whatlinkshere-tools {
        font-size: 80%;
      }

      /* Affichage des coordonnées géo à côté du titre, pour tous les skins. */
      #coordinates {
        margin-right: 1em;
      }
      #coordinates_osm {
        font-size: 110%;
        box-shadow: 0 0 5px #c0c0f0;
        border-radius: 5px;
        margin-left: 7px;
        padding: 3px;
        background-color: #e0e0e0;
      }
      #coordinates_osm:hover {
        box-shadow: 0 0 5px #a0a0c0;
        background-color: #b0b0b0;
      }

      /* Décoration des titres de sous-chapitre. */
      .mw-parser-output h3 {
        border-bottom: dotted 1px #aaa;
      }
      .mw-parser-output h4,
      .mw-parser-output h5,
      .mw-parser-output h6 {
        border-bottom: dotted 1px #ddd;
      }

      /* rewritePageH1bis() du Common.js, pour [[Modèle:Aide contextuelle]] et plusieurs inlinages du modèle dans des messages système
        n'affiche pas le lien avant son déplacement via JavaScript, pour ne pas avoir de FOUC */
      #helpPage {
        display: none;
      }

      /* Sous-titre ([[Modèle:Sous-titre]]) */
      #sous_titre_h1_moved {
        display: block;
        font-size: 0.7em;
        line-height: 1.3em;
        margin: 0.2em 0 0.1em 0.5em;
      }
      /* Masque le texte avant que JavaScript le déplace au bon endroit */
      .client-js #sous_titre_h1 {
        visibility: hidden;
      }

      /* Met en italique, et met en romain les italiques imbriqués */
      .italique {
        font-style: italic;
      }
      .italique i {
        font-style: normal;
      }

      /* Balise abbr discrète */
      abbr.abbr {
        text-decoration: none;  /* Firefox, Chrome */
        border-bottom: 0;  /* IE */
      }

      /* Balise dfn (instance d'un terme défini) */
      dfn {
        font-style: normal;
        font-weight: bold;
      }
      i > dfn {
        font-style: italic;
      }

      /* Empêche la césure ; utilisé par [[Modèle:Nobr]], entre autres */
      .nowrap {
        white-space: nowrap;
      }

      /* Liens "petit crayon" créés par [[Module:Wikidata]] */
      .wikidata-linkback {
        padding-left: 0.5em;
        /* Pour les copier-collers, retire les alternatives textuelles
                "Voir et modifier les données sur Wikidata" */
        -webkit-user-select: none; /* Safari */
        user-select: none;
      }

      /* Pages [[Spécial:Modifications récentes]], [[Spécial:Suivi des liens]], voir [[MediaWiki:Recentchangestext]] */
      .rcoptions {
        clear: both;
        margin: 0 0 2px 0;
        padding: 0 0.5em;
        border: 1px solid #ddddf7;
        border-left: 10px solid #ddddf7;
        background-color: #fff;
      }
      .rcoptions hr {
        clear: both;
      }
      fieldset.rcoptions {
        padding-bottom: 0.5em;
      }

      /* Apparence de [[MediaWiki:Noarticletext]] */
      .noarticletext {
        background: #f9f9f9;
        margin-top: 1em;
        padding: 5px;
        border: 1px solid #aaa;
        border-right: 2px solid #aaa;
        border-bottom: 2px solid #aaa;
      }

      /* Workaround à cause de [[MediaWiki:Searchmenu-new]]
        qui ferme prématurémént son conteneur "p.mw-search-createlink" */
      .mw-searchresults-has-iw .mw-search-createlink {
        float: none;
      }

      /* Largeur minimale du cadre des miniatures d'images */
      .thumbinner {
        min-width: 100px;
      }

      /* Place un damier de vérification en arrière-plan dans la page de description
        de l'image, visible seulement en cas d'image transparente ou semi-transparente. */
      #file img {
        background: url("//upload.wikimedia.org/wikipedia/commons/5/5d/Checker-16x16.png");
      }

      /* Barre d'outils */
      .ns-0 #mw-editbutton-signature {
        display: none;
      }

      /* Fond gris pour les pages protégées en modification */
      #wpTextbox1[readonly],
      #wpTextbox1[readonly] + .ui-resizable > .ace_editor {
        background: #eee;
      }

      /* Ne pas afficher le lien complet des URL externes sur la version imprimable
        (à faire manuellement, grâce à class="plainlinksneverexpand"). */
      .plainlinksneverexpand a.external.text:after,
      .plainlinksneverexpand a.external.autonumber:after {
        display: none !important;
      }
      /* Supprimer la flèche de lien externe pour ces liens. */
      .plainlinksneverexpand a {
        background: none !important;
        padding: 0 !important;
      }

      /* Réserver un contenu à l'impression (display rétabli dans MediaWiki:Print.css)
        utilisé pour les entrées de ref group. */
      .printcssonly {
        display: none;
      }

      /* Bandeau des brouillons problématique avec l'éditeur visuel. */
      .ve-init-target .user-draft-header {
        display: none;
      }

      /* Message-système des sous-pages de discussion. Classe .fieldsetlike etc.
        pour permettre la réutilisation de ces styles. */
      .fieldsetlike {
        text-align: center;
        border: 1px solid #aaa;
        margin: 1em 0;
        padding: 0 0 0.4em 0;
      }
      .fieldsetlike .legendlike {
        margin-top: -0.8em;
      }
      .fieldsetlike .legendtextlike {
        padding: 0 8px;
        background: white;
      }
      .fieldsetlike ul {
        list-style-type: none;
        margin: 0;
      }
      .fieldsetlike li {
        display: inline;
        white-space: nowrap;
      }
      .fieldsetlike li:not(:last-child):after {
        content: '\a0- ';
        white-space: normal; /* nécessaire s'il n'y a pas d'espace entre les <li> dans le HTML */
      }
      #talkpageheader li {
        color: #707070;
      }

      /* Catégories cachées */
      #mw-hidden-catlinks {
        font-size: 0.85em;
      }

      /* Personnalisation de l'apparence des liens vers les pages d'homonymie. */
      .homonymie {
        margin-top: 0.5em;
        padding-left: 2em;
        padding-bottom: 0.5em;
        margin-bottom: 0.5em;
        background: white;
        font-style: italic;
        border-bottom: 1px #aaa solid;
      }

      /* Rapproche le bandeau du titre de la page (et application du style uniquement dans ce cas de figure) */
      body:not(.skin-timeless):not(.skin-minerva) .mw-parser-output > .homonymie:first-child,
      body:not(.skin-timeless):not(.skin-minerva) .mw-parser-output > .mw-empty-elt:first-child + .homonymie {
        margin-top: -0.5em;
      }

      /* Annulation du ruleset précédent sur les pages de diff */
      body:not(.skin-timeless):not(.skin-minerva) .diff-currentversion-title + .mw-parser-output > .homonymie:first-child,
      body:not(.skin-timeless):not(.skin-minerva) .diff-currentversion-title + .mw-parser-output > .mw-empty-elt:first-child + .homonymie {
        margin-top: 0.5em;
      }

      /* Masque les bordures adjacentes */
      .homonymie + .homonymie {
        margin-top: calc(-0.5em - 1.05px); /* -margin-bottom - (1px + léger excédent) */
      }

      /* Masquage de Wikimania dans les liens interprojets. */
      li.wb-otherproject-wikimania {
        display: none;
      }

      /* Bandeau label et icônes des AdQ/BA à côté des liens interlangues et
        dans les modèles {{Q}} et {{B}}. */
      li.AdQ,
      li.LdQ,
      li.PdQ,
      li.badge-featuredarticle,
      li.badge-featuredlist,
      li.badge-featuredportal {
        list-style-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/8/83/Article_de_qualit%C3%A9.svg/10px-Article_de_qualit%C3%A9.svg.png");
      }
      li.BA,
      li.badge-goodarticle,
      li.badge-goodlist,
      li.badge-recommendedarticle {
        list-style-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/1/11/Bon_article.svg/10px-Bon_article.svg.png");
      }

      /* [[Modèle:Indication de langue]] et [[Modèle:Lien]]. */
      .indicateur-langue,
      .indicateur-format {
        font-family: monospace;
        font-weight: bold;
        font-size: small;
        font-style: normal;
        word-spacing: -0.4em;
      }

      /* [[Modèle:Colonnes]] et [[Modèle:Début de colonnes]]. */
      .colonnes > ol, .colonnes > ul {
        margin-top: 0;
      }

      /* Compensation du style précédent */
      .colonnes {
        margin-top: 0.3em;
      }

      /* Évitons de couper les éléments de listes sur plusieurs colonnes */
      /* (déjà présent nativement dans ".mw-references-columns", refs [[phab:T33597]] et [[gerrit:229852]]) */
      :is(.colonnes, .references-small) li {
        page-break-inside: avoid; /* older browsers */
        break-inside: avoid-column;
      }

      /* Taille et famille des polices pour les écritures non-latines.
        Voir aussi [[modèle:Langue]]. */
      .lang-grc,
      .lang-el { /* Écriture grecque : moderne (monotonique), ancien (polytonique) */
        font-family: 'Arial Unicode MS', 'DejaVu Sans', Athena, Gentium, 'Palatino Linotype', 'Lucida Sans Unicode', 'Lucida Grande', Code2000, sans-serif;
      }
      .lang-th { /* Écriture thaïe */
        font-family: 'Segoe UI', Tahoma, sans-serif;
      }

      /* Affichage des chiffres romains, voir [[modèle:Rom]] ou [[modèle:Romain]]. */
      .romain {
        text-transform: lowercase;
        font-variant: small-caps;
      }

      /* Affichage des petites capitales, voir [[modèle:Petites capitales]]. */
      .petites_capitales {
        font-variant: small-caps;
      }

      /* Taille et alignement des formules mathématiques. */
      .texhtml {
        font-family: "Nimbus Roman No9 L", "Times New Roman", Times, serif;
        font-size: 118%;
        line-height: 1;
        white-space: nowrap;
        font-variant-numeric: lining-nums tabular-nums;
        font-kerning: none;
      }
      .texhtml .texhtml {
        font-size: 100%;
      }
      img.tex.center {
        width: auto;
        display: block;
        margin: 0 auto;
      }
      img.tex.left {
        display: block;
        margin-left: 1.6em;
      }

      /* Change la couleur des liens, pour les fonds colorés sombres ;
        utilisé principalement dans des cadres de portails pour les liens "modifier" ;
        cette classe est à utiliser avec parcimonie, et en aucun cas dans les articles. */
      .lienClair a {
        color: #a0a0a0;
      }
      .lienClair a:hover {
        color: #a0a0a0;
        text-decoration: underline;
      }
      .lienClair a:visited {
        color: #b9b9b9;
      }

      /* Lien vers une ébauche */
      a.stub {
        color: #339900;
      }
      a.stub:visited {
        color: #336600;
      }

      /* Références : éviter une trop grande réduction de taille de caractères
        dans certaines configurations. */
      .references small {
        font-size: 1em !important;
      }

      /* Par défaut, cacher les crochets autour des appels de notes. */
      .cite_crochet {
        display: none;
      }

      /* Éviter d'obtenir un interlignage de taille variable. */
      .reference,
      .exposant {
        vertical-align: text-top;
        position: relative;
        font-size: 0.8em;
        top: -5px;
      }

      .reference-text sup {
        vertical-align: text-top;
        position: relative;
        font-size: 0.75em;
        top: -0.1em;
      }
      .reference {
        padding-left: 1px;
      }

      /* Diminution décalage, en raison du line-height réduit dans .infobox_v2 */
      .infobox_v2 .reference {
        top: -2px;
      }

      /* Pour [[MediaWiki:Gadget-ArchiveLinks.js]] (activé par défaut) : même couleur que les liens externes */
      small.cachelinks > a {
        color: #36b;
      }

      /* Numérotations différentes pour les notes de bas de page. */
      .references-small.decimal ol {
        list-style-type: decimal;
      }
      .references-small.lower-alpha ol {
        list-style-type: lower-alpha;
      }
      .references-small.lower-greek ol {
        list-style-type: lower-greek;
      }
      .references-small.lower-roman ol {
        list-style-type: lower-roman;
      }
      .references-small:is(.lower-alpha, .lower-greek, .lower-roman) ol ol {
        list-style-type: decimal;
      }

      /* Répartition égale des références sur plusieurs colonnes :
        pas d'espace supplémentaire en haut de première colonne */
      .references-small ol {
        margin-top: 0;
      }

      /* Compensation du style précédent */
      .references-small {
        margin-top: 0.3em;
      }

      /* Cadre pour [[Modèle:Références nombreuses]] */
      @media not print {
        .reference-cadre {
          height: 30em;
          overflow: auto;
          padding: 3px;
          border: 1px solid #AAA;
          margin-top: 0.3em;
        }
        .reference-cadre .references-small {
          margin-top: 0;
        }
      }

      /* Mise en surbrillance de l'ouvrage cliqué pour faciliter la navigation,
        comme fait déjà MediaWiki pour les notes et références. */
      .ouvrage:target {
        background: #eaf3ff;
      }

      /* Ligne de tableau dans « Informations sur la page » */
      body.action-info tr:target {
        background: #eaf3ff;
      }

      /* Style des modèles [[modèle:Référence nécessaire]] et [[modèle:Citation nécessaire]]. */
      span.need_ref {
        border-bottom: 1px solid #aaa;
      }
      div.need_ref {
        border: 1px solid #aaa;
        padding: 0.5em;
      }

      /* Référence présente */
      span.ref:hover {
        border-bottom: 1px solid #aaa;
      }

      /* Gestion automatique de l'ISBN par MediaWiki. */
      .mw-magiclink-isbn {
        white-space: nowrap;
      }

      /* Mode d'affichage par défaut des données dans l'espace référence. */
      .edition-Liste {
        display: block;
      }
      .edition-WikiNorme,
      .edition-BibTeX,
      .edition-ISBD,
      .edition-ISO690 {
        display: none;
      }

      /* Style de { , } entre les références */
      .cite_virgule {
        padding-left: 0;
        padding-right: 1px;
      }

      /* Boites et messages */
      div.boite-a-droite {
        display: table;
        clear: right;
        float: right;
        margin: 0.3em 0 1em 1em;
        width: 20em;
        position: relative; /* Pour les images manuelles */
        border-style: solid;
        border-width: 1px;
        padding: 4px;
        text-align: left;
      }
      .boite-sans-fond {
        border-color: #aaa; /* Comme boite-grise */
      }
      .boite-grise { /* Similaire au bandeau de catégorie */
        border-color: #aaa;
        background-color: #f9f9f9;
      }

      /* Types de boites */
      .bandeau-article,
      .bandeau-discussion,
      .bandeau-simple,
      .bandeau-systeme,
      .bandeau-section{
        border-style: solid;
        overflow: hidden;
        position: relative;
      }
      .bandeau-article {
        border-width: 1px 1px 1px 10px;
        font-size: 0.9em;
        line-height: 1.25em;
        padding: 0.5em 1em;
        margin: 0.8em 10%;
      }
      .bandeau-systeme {
        clear: both;
        border-width: 2px;
        padding: 0.5em 1em;
        margin: 0.8em 3%;
      }
      .bandeau-simple {
        clear: both;
        border-width: 1px;
        padding: 0.5em 1em;
        margin: 0.8em auto;
      }
      .bandeau-discussion {
        border-width: 1px;
        border-radius: 10px;
        padding: 0.2em 0.5em;
        margin: 0.8em 7%;
      }
      @media (max-width: 981px) {
        .bandeau-discussion {
          margin: 0.8em 4%;
        }
      }
      div.bandeau-section { /* Pour le [[modèle: Article détaillé]] et autres */
        display: block;
        font-size: 0.95em;
        border-width: 1px 0;
        padding: 0.2em 0.5em 0.3em 0;
        margin: 0.3em 0 0.7em 2em;
      }
      .bandeau-centrer {
        display: table;
        width: 100%;
        text-align: center;
      }
      .bandeau-cell {
        display: table-cell;
        vertical-align: middle;
      }
      .bandeau-cell > p:first-child {
        margin-top: 0;
      }
      .bandeau-cell > p:last-child {
        margin-bottom: 0;
      }

      /* Style des bandeaux d'articles. Voir [[Wikipédia:Prise de décision/Changement de style des messages d'avertissement]]. */
      .bandeau-niveau-grave {
        border-color: #aa0044;
        background-color: #ffcccc;
      }
      .bandeau-niveau-modere {
        border-color: #ff8822;
        background-color: #ffeedd;
      }
      .bandeau-niveau-ebauche,
      .bandeau-niveau-information {
        border-color: #77ccff;
        background-color: #fbfbfb;
      }
      .bandeau-simple.bandeau-niveau-information,
      .bandeau-discussion.bandeau-niveau-information { /* Dérive de la classe vectorbox */
        border-color: #a7d7f9;
        background-color: #f5faff;
      }
      .bandeau-niveau-detail, /* Voir [[Wikipédia:Prise de décision/Unification des modèles : article détaillé et Loupe]] */
      .bandeau-section.bandeau-niveau-information {
        border-color: #e7e7e7;
        background-color: #fdfdfd;
      }
      .bandeau-niveau-neutre {
        border-color: #aaa;
        background: #f9f9f9;
      }

      .bandeau-icone {
        vertical-align: middle;
        text-align: center;
        width: 45px;
        /* @noflip */
        padding-right: 1em;
      }
      :is(.homonymie, .bandeau-section) .bandeau-icone {
        width: auto;
        /* @noflip */
        padding-right: 0.5em;
      }
      .bandeau-titre {
        font-size: 1.1em;
        line-height: 1.4em;
      }
      .bandeau-texte {
        font-size: 0.9em;
        line-height: 1.2em;
      }

      /* Styles pour les bannières */

      .topbanner {
        position: relative;
        overflow: hidden;
        max-width: 1800px;
        height: auto;
      }
      .topbanner img {
        max-width: 100%;
        height: auto;
      }
      .topbanner-box {
        position: absolute;
        z-index: 2;
        margin-top: 1.5em;
        color: white;
        width: 50%;
        min-width: 20em;
        left: 2%;
        text-align: left;
      }
      .topbanner .name {
        position: absolute;
        z-index: 2;
        margin: 0.6em 0 0 0.4em;
        padding: 8px 7px;
        font-size: 2.2em;
        background: rgb(16,16,16);
        background: rgba(0,0,0,0.5);
        border-radius: 4px;
        color: white;
        white-space: nowrap;
        line-height: 0.9em;
      }

      /* Petites icônes */
      .indentation,     /* pas d'image correspondante */
      .loupe,           /* loupe, voir le [[modèle:Article détaillé]] */
      .general,         /* flèche pour le [[modèle:Article principal]] */
      .accessibilite,   /* symbole handicap, pour le [[modèle:Encart]] */
      .etoile-or,
      .etoile-argent,
      .categorie,       /* symbole du [[modèle:Catégorie principale]] */
      .biblio,          /* livres pour le [[modèle:Sources de section]] */
      .recyclage,       /* symbole du [[modèle:Section à recycler]] */
      .archives,        /* symbole d'archivage */
      .sons,            /* pour le [[modèle:Média externe]] */
      .videos,          /* pour le [[modèle:Média externe]] */
      .incomplet,       /* cône de chantier pour le [[modèle:Section vide ou incomplète]] */
      .sources,         /* livre ouvert du [[modèle:Section à sourcer]] */
      .important,       /* triangle rouge : mise en garde */
      .en-travaux,      /* triangle jaune : en construction */
      .information,
      .conflit-edition,
      .incubator,
      .extension,       /* extensions MediaWiki */
      .wikispecies,
      .metawiki,
      .wikiversity,
      .wikipedia,
      .wikibooks,
      .wikinews,
      .wikiquote,
      .wikisource,
      .commons,
      .wikimedia,
      .wiktionary,
      .wikidata,
      .wikivoyage,
      .wwwmediawiki {
        background-repeat: no-repeat;
        line-height: 1.5em;
        text-indent: 23px;
        display: inline-block;
      }
      .loupe {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/6/61/Searchtool.svg/15px-Searchtool.svg.png");
        background-position: 2px 3px;
      }
      .general {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Nuvola_apps_download_manager2-70%25.svg/15px-Nuvola_apps_download_manager2-70%25.svg.png");
        background-position: 2px 3px;
      }
      .accessibilite {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/4/44/Gnome-preferences-desktop-accessibility.svg/18px-Gnome-preferences-desktop-accessibility.svg.png");
        background-position: 2px 0;
      }
      .etoile-or {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/8/83/Article_de_qualit%C3%A9.svg/19px-Article_de_qualit%C3%A9.svg.png");
        background-position: 1px 1px;
      }
      .etoile-argent {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/1/11/Bon_article.svg/19px-Bon_article.svg.png");
        background-position: 1px 1px;
      }
      .categorie {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/3/34/Nuvola_apps_kpager.svg/21px-Nuvola_apps_kpager.svg.png");
        background-position: 0 0;
      }
      .biblio {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Books-aj.svg_aj_ashton_01.svg/20px-Books-aj.svg_aj_ashton_01.svg.png");
        background-position: 2px 2px;
      }
      .recyclage {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Recycle002.svg/20px-Recycle002.svg.png");
        background-position: 1px 1px;
      }
      .archives {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/9/94/Filing_cabinet_icon.svg/21px-Filing_cabinet_icon.svg.png");
        background-position: 0 1px;
      }
      .conflit-edition {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/8/8e/OOjs_UI_indicator_alert-progressive.svg/12px-OOjs_UI_indicator_alert-progressive.svg.png");
        background-position: 0 3px;
        text-indent: 16px;
        line-height: 1.3em;
      }
      .sons {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/4/44/Nuvola_apps_arts.png/18px-Nuvola_apps_arts.png");
        background-position: 1px 1px;
      }
      .videos {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Nuvola_apps_kaboodle.svg/18px-Nuvola_apps_kaboodle.svg.png");
        background-position: 1px 1px;
      }
      .incomplet {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/8/87/Fairytale_warning.png/16px-Fairytale_warning.png");
        background-position: 2px 3px;
      }
      .sources {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/6/64/Question_book-4.svg/20px-Question_book-4.svg.png");
        background-position: 1px 4px;
      }
      .important {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Nuvola_apps_important.svg/19px-Nuvola_apps_important.svg.png");
        background-position: 1px 2px;
      }
      .en-travaux {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/a/af/Under_construction_icon-yellow.svg/20px-Under_construction_icon-yellow.svg.png");
        background-position: 1px 2px;
      }
      .information {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Information_icon_with_gradient_background.svg/19px-Information_icon_with_gradient_background.svg.png");
        background-position: 1px 2px;
      }
      .incubator {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Incubator-logo.svg/15px-Incubator-logo.svg.png");
        background-position: 1px 1px;
      }
      .extension {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/b/bb/MediaWiki-notext.svg/21px-MediaWiki-notext.svg.png");
        background-position: 0 4px;
      }
      .wikispecies {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/d/df/Wikispecies-logo.svg/17px-Wikispecies-logo.svg.png");
        background-position: 1px 0;
      }
      .wikisource {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Wikisource-logo.svg/17px-Wikisource-logo.svg.png");
        background-position: 1px 1px;
      }
      .wikipedia {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/6/63/Wikipedia-logo.png/19px-Wikipedia-logo.png");
        background-position: 1px 0;
      }
      .wikibooks {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Wikibooks-logo.svg/19px-Wikibooks-logo.svg.png");
        background-position: 1px 1px;
      }
      .metawiki {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/7/75/Wikimedia_Community_Logo.svg/18px-Wikimedia_Community_Logo.svg.png");
        background-position: 1px 1px;
      }
      .wikiversity {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/9/91/Wikiversity-logo.svg/20px-Wikiversity-logo.svg.png");
        background-position: 0 2px;
      }
      .wiktionary {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Wiktionary-logo.svg/20px-Wiktionary-logo.svg.png");
        background-position: 0 1px;
      }
      .wikinews {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/2/24/Wikinews-logo.svg/20px-Wikinews-logo.svg.png");
        background-position: 0 5px;
      }
      .wikiquote {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Wikiquote-logo.svg/16px-Wikiquote-logo.svg.png");
        background-position: 2px 1px;
      }
      .commons {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Commons-logo.svg/14px-Commons-logo.svg.png");
        background-position: 3px 0;
      }
      .wikimedia {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/8/81/Wikimedia-logo.svg/20px-Wikimedia-logo.svg.png");
        background-position: 0 0;
      }
      .wikidata {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Wikidata-logo.svg/22px-Wikidata-logo.svg.png");
        background-position: 0 5px;
      }
      .wikivoyage {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wikivoyage-Logo-v3-icon.svg/20px-Wikivoyage-Logo-v3-icon.svg.png");
        background-position: 1px 1px;
      }
      .wwwmediawiki {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/b/bb/MediaWiki-notext.svg/20px-MediaWiki-notext.svg.png");
        background-position: 1px 3px;
      }

      /* Grosses icônes */
      .grosse-icone {
        display: table-cell;
        vertical-align: middle;
        padding-left: 60px;
        background-repeat: no-repeat;
        background-position: left center;
        text-indent: 0; /* Certaines icones ont une version « en ligne ». */
        height: 48px;
      }

      .grosse-icone.etoile-or {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/8/83/Article_de_qualit%C3%A9.svg/40px-Article_de_qualit%C3%A9.svg.png");
      }
      .grosse-icone.etoile-argent {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/1/11/Bon_article.svg/40px-Bon_article.svg.png");
      }
      .grosse-icone.archives {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/9/94/Filing_cabinet_icon.svg/48px-Filing_cabinet_icon.svg.png");
      }
      .grosse-icone.ancienne-version {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Clock_and_warning.svg/46px-Clock_and_warning.svg.png");
      }
      .grosse-icone.maintenance {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Tools_nicu_buculei_01.svg/46px-Tools_nicu_buculei_01.svg.png");
      }
      .grosse-icone.protection-admin {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/9/97/Full-protection-shackle-frwiki.svg/32px-Full-protection-shackle-frwiki.svg.png");
      }
      .grosse-icone.semi-protection {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/d/de/Semi-protection-shackle-frwiki.svg/32px-Semi-protection-shackle-frwiki.svg.png");
      }
      .grosse-icone.roue-dentee {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Crystal_Clear_action_run.png/46px-Crystal_Clear_action_run.png");
      }
      .grosse-icone.conflit-edition {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/8/86/Passage_pieton_rouge.png/46px-Passage_pieton_rouge.png");
      }
      .grosse-icone.titre-protege {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/thumb/c/c4/System-lock-screen.svg/46px-System-lock-screen.svg.png");
      }
      .grosse-icone.gros-warning {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/f/f6/OOjs_UI_icon_alert-destructive.svg");
        background-size: 46px;
      }
      .grosse-icone.attention {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/3/3b/OOjs_UI_icon_alert-warning.svg");
        background-size: 46px;
      }
      .grosse-icone.information {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/1/13/OOjs_UI_icon_notice-progressive.svg");
        background-size: 46px;
      }
      .grosse-icone.ebauche {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/8/8a/OOjs_UI_icon_edit-ltr-progressive.svg");
        background-size: 46px;
      }

      /* Styles par défaut pour les bandeaux en haut des articles. Voir
        [[Projet:Charte graphique/Harmonisation des messages d'avertissement]]
        et [[Wikipédia:Prise de décision/Harmonisation des messages d'avertissement]]. */
      /* Classe pour toutes les alertes. */
      .alerte {
        padding: 0.11em;
        background: #ffd;
        margin-bottom: 0.4em;
        font-style: italic;
      }
      /* Classe supplémentaire pour les alertes graves. */
      .grave {
        border: 1px solid #f96;
      }

      /* Styles des « messagebox » standard. */
      .messagebox {
        border: 1px solid #aaa;
        background: #f9f9f9;
        width: 80%;
        margin: 0 auto 1em auto;
        padding: 0.2em;
      }
      .messagebox.standard-talk {
        border: 1px solid #c0c090;
        background: #f8eaba;
      }

      .vectorbox {
        width: 85%;
        background: #f5faff;
        border: 1px solid #a7d7f9;
        border-radius: 10px;
        margin: 0 auto 1em auto;
      }

      /* Standardisation de quelques messages systèmes :
        * class="mw-alerte" : bandeaux d'alerte comme [[MediaWiki:Editinginterface]].
        * class="mw-toolbox" : boîtes à outils comme sur [[MediaWiki:Sp-contributions-footer]]. */

      /* Suppression du message avertissant du lag de 1 seconde dans la liste de suivi. */
      .mw-lag-warn-normal {
        display: none;
      }

      /* Messages d'alerte */
      .mw-alerte {
        width: 100%;
        clear: both;
        background: #faebd7;
        border: 2px solid #ff8c00;
      }

      /* Boîtes à outils */
      .mw-toolbox {
        font-size: 90%;
        background: #f8f8f8;
        border: 1px solid #b8b8b8;
        padding: 0.25em 1em;
        clear: both;
      }

      /* Styles des boîtes déroulantes, voir [[Modèle:Boîte déroulante/Documentation]]. */
      div.NavFrame {
        padding: 2px;
        border: 1px #aaa;
        text-align: center;
        border-collapse: collapse;
        font-size: 95%;
      }
      div.NavPic {
        padding: 2px;
        float: left;
      }
      div.NavFrame div.NavHead {
        font-weight: bold;
        background: #efefef;
      }
      div.NavEnd {
        height: 0;
        clear: both;
      }

      /* Styles de [[Modèle:Méta palette de navigation]]. */
      table.navbox {
        background: #f9f9f9;
        border: 1px solid #aaa;
        clear: both;
        font-size: 89%;
        margin: 1em 0 0;
        padding: 2px;
        text-align: center;
        width: 100%;
      }
      table.navbox-subgroup {
        background: transparent;
        border: 0;
        margin: -3px;
        padding: 0;
        text-align: center;
        width: calc(100% + 6px);
      }
      th.navbox-title {
        background: #ccf;
        padding-left: 1em;
        padding-right: 1em;
      }
      th.navbox-group {
        background: #ddf;
        vertical-align: middle;
        width: 150px;
        padding-left: 1em;
        padding-right: 1em;
      }
      th.navbox-group + td.navbox-list,
      table.navbox-subgroup td.navbox-list {
        text-align: left;
      }
      td.navbox-even {
        background: #f0f0ff;
      }
      table.navbox-subgroup td.navbox-even {
        background: transparent;
      }
      td.navbox-banner {
        background: #ddf;
        vertical-align: middle;
        padding-left: 1em;
        padding-right: 1em;
      }
      tr.navboxHidden {
        display: none;
      }
      @media (max-width: 981px) {
        td.navbox-image {
          display: none;
        }
      }

      /* Modèle de palettes groupées, [[Modèle:Palette]]. */
      div.navbox-container {
        border: 1px solid #aaa;
        margin-top: 1em;
      }
      div.navbox-container table.navbox {
        border: 0;
        margin: 0;
      }

      /* Liens de masquage/affichage : [[Modèle:Boîte déroulante]] et [[Modèle:Méta palette de navigation]] */
      .navboxToggle,
      .NavToggle {
        font-size: 90%;
        font-weight: normal;
        float: right !important;
        min-width: 6em;
      }

      /* Styles pour [[Modèle:Section déroulante début]] */
      .client-js .titre-section-deroulante {
        padding-left: 18px;
      }
      .client-js .mw-made-collapsible .titre-section-deroulante,
      .client-js .mw-made-collapsible .titre-section-deroulante.mw-collapsible-toggle-expanded {
        background:
          url("//upload.wikimedia.org/wikipedia/commons/0/03/MediaWiki_Vector_skin_right_arrow.svg") -9999px -9999px no-repeat,
          url("//upload.wikimedia.org/wikipedia/commons/f/f1/MediaWiki_Vector_skin_action_arrow.svg") left center no-repeat;
      }
      .client-js .mw-made-collapsible .titre-section-deroulante.mw-collapsible-toggle-collapsed {
        background:
          url("//upload.wikimedia.org/wikipedia/commons/0/03/MediaWiki_Vector_skin_right_arrow.svg") left center no-repeat,
          url("//upload.wikimedia.org/wikipedia/commons/f/f1/MediaWiki_Vector_skin_action_arrow.svg") -9999px -9999px no-repeat;
      }

      /* Alignement du tableau : flottant à droite ou à gauche, ou centré.
        On peut aligner à droite ou à gauche sans flottement en ajoutant
        le [[modèle:Clr]] en bas du tableau. */
      table.gauche,
      table.left {
        float: left;
        margin: 0 1em 1em 0;
      }
      table.droite,
      table.right {
        float: right;
        margin: 0 0 1em 1em;
      }
      table.centre,
      table.center {
        margin: 1em auto;
      }
      /* Pour les cas où le code de l'article contienne un paramètre align de valeur center */
      table.wikitable[align=center] {
        margin: 1em auto;
      }
      /* Annule propriétés issues de ".center" dans le /resources/src/mediawiki.skinning/elements.less */
      table.center {
        width: auto;         /* annule width: 100%; */
        text-align: inherit; /* annule text-align: center; */
      }

      /* Workaround pour les captions ridiculement étroits quand table repliée */
      table.mw-collapsible:not(.centre):not(.center) > caption {
        white-space: nowrap;
      }
      /* Méthode différente pour les tables centrées (corrige aussi le centrage erroné avec firefox) */
      table.mw-collapsible.centre, table.mw-collapsible.center {
        min-width: 60%;
      }
      /* Système différent pour écrans étroits, au cas où le caption dépasserait en largeur */
      @media (max-width: 981px) {
        table.mw-collapsible:not(.centre):not(.center) > caption {
          white-space: normal;
        }
        table.mw-collapsible {
          width: 100%;
          float: none;
        }
      }

      /* Classe pour substituer l'attribut obsolète cellpadding=0 */
      table.nocellpadding > * > tr > td,
      table.nocellpadding > * > tr > th {
        padding: 0;
      }

      /* Classes permettant d'alterner les couleurs de ligne dans les
        tableaux selon le nombre de lignes d'en-tête :
        * .alternance si nombre impair ou .alternance2 si nombre pair.
        * .sortable : les tableaux triables nécessitent d'inverser
          l'alternance. */
      .alternance,
      .alternance2 {
        border-collapse: collapse;
      }
      table:is(.alternance, .alternance2) > * > tr > th {
        background-color: #e6e6e6;
      }
      .alternance tr,
      .alternance th[scope="row"] {
        background-color: #fcfcfc;
      }
      .alternance:not(.sortable) tr:nth-child(odd),
      .alternance.sortable tr:nth-child(even),
      .alternance:not(.sortable) tr:nth-child(odd) th[scope="row"],
      .alternance.sortable tr:nth-child(even) th[scope="row"] {
        background-color: #eee;
      }
      .alternance2 tr,
      .alternance2 th[scope="row"] {
        background-color: #eee;
      }
      .alternance2 tr:nth-child(odd),
      .alternance2 tr:nth-child(odd) th[scope="row"] {
        background-color: #fcfcfc;
      }

      /* Classe pour permettre un titre d'une couleur différente sans avoir à l'imposer dans chaque cellule */
      table.titre-en-couleur > * > tr > th {
        background-color: transparent;
      }

      /* Espacement du lien "[afficher]" ajouté par la classe mw-collapsible
        en attendant résolution de https://phabricator.wikimedia.org/T155347 */
      :is(caption, th) .mw-collapsible-toggle {
        margin-inline-start: 0.3em;
      }

      /* Classe pour les listes horizontales séparées par des puces.
        Adaptation de la classe 'hlist' de en:User:Edokter.
        (cf. [[mw:Snippets/Horizontal lists]]). */
      .liste-horizontale ul,
      .liste-horizontale ol,
      .liste-horizontale li {
        display: inline;
        margin-left: 0;
      }

      /* utilisation de la valeur de "min-width-breakpoint-desktop" */
      /* https://doc.wikimedia.org/codex/latest/design-tokens/breakpoint.html */
      @media (min-width: 1120px) {
        .liste-horizontale li {
          white-space: nowrap;
        }
      }
      .liste-horizontale li:not(:last-child):after {
        content: "\A0· ";
        font-weight: bold;
        white-space: normal; /* nécessaire s'il n'y a pas d'espace entre les <li> dans le HTML */
      }

      .liste-horizontale li > ul,
      .liste-horizontale li > ol {
        white-space: normal;
      }
      .liste-horizontale li > ul:before,
      .liste-horizontale li > ol:before {
        content: " (";
      }
      .liste-horizontale li > ul:after,
      .liste-horizontale li > ol:after {
        content: ")";
      }

      .liste-horizontale ol {
        counter-reset: listitem;
      }
      .liste-horizontale ol > li {
        counter-increment: listitem;
      }
      .liste-horizontale ol > li:before {
        content: counter(listitem) ".\A0";
      }

      /* Listes sans puces */
      body:not(.skin-minerva) .liste-simple ul {
        line-height: inherit;
        list-style: none;
        margin: 0;
      }
      body:not(.skin-minerva) .liste-simple ul li {
        margin-bottom: 0;
      }
      /* support des sous-listes */
      body:not(.skin-minerva) .liste-simple ul ul {
        margin-left: 1.6em;
      }

      /* Style par défaut des bandeaux de portail décidés sur
        [[Wikipédia:Prise de décision/Bandeaux de portails]]
        Utilisé dans [[Modèle:Méta lien vers portail]] et [[Modèle:Portail]]. */
      #bandeau-portail {
        border: solid #aaa 1px;
        background-color: #f9f9f9;
        text-align: center;
        margin-top: 1em;
      }
      #bandeau-portail,
      #liste-portail {
        padding: 4px;
        margin-left: 0;
        clear: both;
      }
      #liste-portail li,
      #bandeau-portail li{
        display: inline;
      }
      .bandeau-portail-element {
        white-space: nowrap;
        margin: 0 1.5em;
      }
      .bandeau-portail-icone {
        margin-right: 0.5em;
      }
      .bandeau-portail-texte {
        font-weight: bold;
      }

      /* Classes pour les colonnes des portails */
      .portail-gauche,
      .portail-droite {
        box-sizing: border-box;
      }
      .portail-gauche {
        float: left;
        padding-right: 1.2rem;
      }
      .portail-droite {
        float: right;
      }
      @media (max-width: 981px) {
        .portail-gauche,
        .portail-droite {
          float: none;
          width: auto !important;
        }
        .portail-gauche {
          padding-right: 0;
        }
      }

      /* Page d'accueil et portail utilisant la même structure */
      .accueil-contenu {
        margin: 0.4em -1% 0.4em 0;
        display: flex;
        flex-flow: wrap;
        overflow: hidden; /*be kind ie10 et les navigateurs ne gérant pas les flexbox */
      }
      .accueil-droite,
      .accueil-gauche {
        display: flex;
        flex-flow: wrap;
        align-content: flex-start;
        margin: 0.4em 1% 0.4em 0;
        border: 1px solid #a7d7f9;
        border-radius: 1em;
      }
      .accueil-droite {
        background: #f5faff;
        flex: 21em;
        overflow: hidden;/*ie10*/
      }
      .accueil-gauche {
        flex: 2 35em;
        float: left; /*ie10*/
        width: 64%; /*ie10*/
      }
      .accueil-cadre {
        padding: 1.2em;
      }
      .accueil-cadre .mw-headline-number {
        display: none;
      }

      /*
      Retire les numéros ajoutés lorsque "Préférences > Apparence > Numéroter automatiquement les titres de section" est coché
      TODO : éventuellement créer une classe générique à ajouter à un div conteneur, permettant d'utiliser la fonctionnalité ailleurs
      */
      body.page-Wikipédia_Accueil_principal .mw-headline-number {
        display: none;
      }

      /* Bandeau accueil */
      #interwiki-listecomplete {
        font-weight: bold;
      }

      /* Mise en page Accueil version 2017 */

      #accueil_2017_en-tete {
        background: linear-gradient(to bottom, #fff, #e8f2f8);
        border-bottom: solid 1px #a8d7fc;
      }
      #accueil_2017_bandeau {
        background: url("//upload.wikimedia.org/wikipedia/commons/a/aa/Wikipedia-logo-v2-o50.svg") no-repeat -110px -15px;
        background-size: 300px 300px;
        padding: 1.5rem 1rem 1rem;
        font-family: 'Open Sans', Sans-serif;
      }
      #accueil_2017_bloc-titre {
        display: inline-block;
        margin-left: 14rem;
        margin-bottom: 1rem;
        text-align: left;
        line-height: 1.6;
        color: #457;
      }
      #accueil_2017_bloc-titre h2 {
        margin: 0;
        padding: 0;
        border: none;
        font-size: 200%;
        font-weight: bold;
        font-family: 'Open Sans', Sans-serif;
        color: #457;
      }
      #accueil_2017_bloc-titre p {
        margin: 0;
        padding: 0;
        font-size: 95%;
      }
      #accueil_2017_bloc-liens {
        text-align: center;
        font-size: 90%;
        font-weight: bold;
      }
      #accueil_2017_lien-mobile {
        margin-bottom: 1rem;
      }

      #accueil_2017_contenu {
        margin-top: 1rem;
      }
      #accueil_2017_contenu .portail-gauche {
        width: 60%;
      }
      #accueil_2017_contenu .portail-droite {
        width: 40%;
      }
      #accueil_2017_contenu:after {
        clear: both;
        display: table; /* "table" et non "block", car on veut aussi empêcher le margin collapse (dans l'affichage en mode "une colonne") */
        content: '';
      }

      .accueil_2017_cadre {
        box-shadow: 0 0 0.3rem #999;
        border-radius: 0.2rem;
        padding: 1.2rem;
        margin-bottom: 1.6rem;
      }
      /* S'assurer que ces règles emportent bien la priorité sur toutes les skins */
      #mw-content-text .accueil_2017_cadre h2 {
        font-variant: small-caps;
        letter-spacing: 0.01em;
        border-bottom: solid 0.2rem #bdd8fb;
        margin: -0.4rem 0 0.5rem;
      }
      .accueil_2017_pied {
        margin-top: 1.8em;
        font-size: 85%;
        text-align: right;
      }

      @media (min-width: 982px) {
        #accueil_2017_contenu {
          display: flex;
        }
        #accueil_2017_contenu .portail-gauche,
        #accueil_2017_contenu .portail-droite {
          display: flex;
          flex-direction: column;
        }
        .accueil_2017_cadre:nth-child(1) {
          flex-grow: 1;
        }
        .accueil_2017_cadre:nth-child(2) {
          flex-grow: 2;
        }
        .accueil_2017_cadre:nth-child(3) {
          flex-grow: 3;
        }
      }

      /* Divers */
      .globegris {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/1/10/Wikipedia-logo-v2-200px-transparent.png");
        background-repeat: no-repeat;
        background-position: -40px -15px;
      }
      .headergris {
        background: #f0f0f0 url("//upload.wikimedia.org/wikipedia/commons/1/1b/Wikibar2.png") no-repeat right;
        margin: 0;
        font-size: 120%;
        font-weight: bold;
        border: 1px solid #a3b0bf;
        text-align: left;
        color: #000;
        padding: 0.15em 0.4em;
      }
      .cadregris {
        border: 1px solid #aaa;
        background: #fcfcfc;
        vertical-align: top;
        padding: 7px;
        margin-bottom: 0.6em;
      }
      .accueil_cadre_lien {
        text-align: right;
        margin-right: 0.5em;
        font-size: xx-small;
      }

      /* Infobox V2 (voir : [[Projet:Infobox/V2]]) */
      .infobox_v2 {
        background: #f9f9f9;
        color: #000;
        font-size: 90%;
        line-height: 1.2em;
        float: right;
        clear: right;
        margin: 0 0 0.5em 1em;
        width: 294px;
        border: 1px solid #aaa;
        border-spacing: 5px;
      }
      .infobox_v2 th {
        vertical-align: super;
        text-align: left;
      }
      .infobox_v2 .entete {
        height: 43px;
        vertical-align: middle;
        text-align: center;
        font-size: 140%;
        font-weight: bolder;
        line-height: 1.1em;
        color: #000;
      }
      /* Padding si pictogramme d'infobox, e.g. ".entete.foobar"
        Pas de pictogramme donc pas de padding sur ".entete.defaut" et ".entete"
        Possibilité de désactiver ce padding en ajoutant une classe "large" */
      .infobox_v2 .entete:not(.defaut):not([class="entete"]):not(.large) {
        padding: 1px 48px;
      }
      /* Pour [[Modèle:Image et son]], etc. */
      .infobox_v2 .media {
        height: 35px;
        vertical-align: middle;
        text-align: center;
        font-weight: bolder;
        color: #000;
      }

      /* Graphiques transparents d'en-têtes des Infobox */
      .entete {
        background-position: right center;
        background-repeat: no-repeat;
      }

      .media.audio {
        background: url("//upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Gnome-speakernotes.png/35px-Gnome-speakernotes.png") no-repeat left top;
      }
      .media.video {
        background: url("//upload.wikimedia.org/wikipedia/commons/thumb/2/20/Tango-video-x-generic.png/35px-Tango-video-x-generic.png") no-repeat left top;
      }

      /* Pour le [[modèle:Infobox/Géolocalisation multiple]] et le [[modèle:Géolocdual]]. */
      .img_toggle ul {
        list-style: none;
        text-align: center;
      }

      /* Infobox V3 */
      div.infobox_v3 {
        padding: 5px;
        width: 25em;
        background: #f9f9f9;
        border: 1px solid #aaa;
        clear: right;
        float: right;
        font-size: 0.9em;
        line-height: 1.4;
        margin: 0 0 0.5em 1em;
        max-width: 325px;
        word-wrap: break-word;
      }
      .infobox_v3 .entete {
        display: table;
        height: 45px;
        width: 100%;
        font-weight: bold;
        text-align: center;
        font-size: 1.4em;
        line-height: 1.1;
        margin-bottom: 10px;
        background-color: #dfedff;
      }
      .infobox_v3 .entete > div {
        display: table-cell;
        vertical-align: middle;
        padding: 3px;
      }
      .infobox_v3:not(.large) .entete.icon > div {
        padding: 3px 48px;
      }
      /* Images */
      .infobox_v3 .images {
        text-align: center;
        display: flex;
        justify-content: space-around;
        align-items: center;
      }
      .infobox_v3 .images a {
        max-width: 100%;
        flex: 0 0 auto; /* be kind ie11 */
      }
      .infobox_v3 .deux-images a {
        max-width: 48%;
      }
      .infobox_v3 .images img {
        max-width: 100%;
        height: auto;
      }
      .infobox_v3 .legend {
        font-size: 0.9em;
        text-align: center;
        margin: 5px 0 8px 0;
      }
      /* Tableaux */
      .infobox_v3 table {
        width: 100%;
        margin: 5px 0;
        table-layout: fixed;
        border-collapse: collapse;
      }
      .infobox_v3 th[scope="col"] {
        text-align: center;
        word-wrap: normal;
      }
      .infobox_v3 th[scope=row] {
        text-align: left;
        /* @noflip */
        padding-right: 10px;
        width: 8em;
        max-width: 140px;
        word-wrap: normal;
      }
      .infobox_v3 th[scope=row],
      .infobox_v3 td {
        padding-top: 4px;
        vertical-align: super;
      }
      .infobox_v3 th[scope=row].middle {
        vertical-align: middle;
      }
      .infobox_v3.bordered th[scope=row],
      .infobox_v3.bordered td {
        padding-bottom: 4px;
        border-top: 1px solid #dfedff;
      }
      .infobox_v3.bordered caption.bordered {
        margin: 0 0 -1px 0;
      }
      .infobox_v3 tr.left td {
        text-align: left;
      }
      .infobox_v3 tr.vborder td {
        border-left: 1px dotted #aaa;
      }
      .infobox_v3 tr.vborder td:first-child {
        border-left: none;
      }
      .infobox_v3 td.data {
        text-align: center;
      }
      .infobox_v3 tr:first-child ul:first-child {
        margin-top: 0;
      }
      /* Titres bloc et caption tableaux */
      .infobox_v3 p.bloc,
      .infobox_v3 caption {
        font-weight: bold;
        text-align: center;
        line-height: 1.1;
        margin: 0 0 5px 0;
        padding: 4px;
        background: #dfedff;
      }
      .infobox_v3 p.bloc {
        margin: 5px 0;
      }
      .infobox_v3 caption.bordered,
      .infobox_v3 p.bordered {
        border-top: 1px solid #dfedff;
        border-bottom: 1px solid #dfedff;
        background: transparent;
      }
      .infobox_v3 .bordered.navbar,
      .infobox_v3 .bordered.infobox-navigateur {
        padding-top: 4px;
        border-bottom: 0;
      }
      /* TODO : mettre à jour la classe .hidden générique */
      .infobox_v3 caption.hidden {
        margin: 0 !important;
        padding: 0 !important;
      }
      /* Séparateur */
      .infobox_v3 .hr {
        font-size: 1px;
        line-height: 1px;
        margin: 5px 0;
        background-color: #dfedff;
      }
      .infobox_v3 .hr.collapse {
        margin: 5px 0 -8px 0;
      }
      /* Tnavbar */
      .infobox_v3 .navbar {
        text-align: right;
        font-size: 0.8em;
        line-height: 1.1;
        margin: 8px 0 0;
      }
      .infobox_v3 .navbar .plainlinks {
        float: left;
      }
      /* Navigateur */
      .infobox_v3 .overflow {
        overflow: hidden;
      }
      .infobox_v3 .prev a,
      .infobox_v3 .prev_bloc {
        background: url("//upload.wikimedia.org/wikipedia/commons/thumb/4/49/ArrowLeftNavbox.svg/12px-ArrowLeftNavbox.svg.png") no-repeat left center;
        float: left;
        max-width: 40%;
        padding: 0 0 0 18px;
        text-align: left;
      }
      .infobox_v3 .next a,
      .infobox_v3 .next_bloc {
        background: url("//upload.wikimedia.org/wikipedia/commons/thumb/1/10/ArrowRightNavbox.svg/12px-ArrowRightNavbox.svg.png") no-repeat right center;
        float: right;
        max-width: 40%;
        padding: 0 18px 0 0;
        text-align: right;
      }

      /* Effets dégradés : utilisables pour un effet ombragé dans les modèles de cadre
        (par exemple : [[Portail:Montréal/Cadre]]). Ceux-ci ne doivent pas dépasser 43
        pixels de hauteur au risque d'y voir un effet indésirable. */
      .degrade {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/f/fb/Gradient_43px.png");
        background-position: top;
        background-size: 100% 100%;
        background-repeat: repeat-x;
      }
      .degrade_rev {
        background-image: url("//upload.wikimedia.org/wikipedia/commons/6/61/Gradient_reversed_43px.png");
        background-position: top;
        background-repeat: repeat-x;
      }

      /* Classe de masquage, remplace display:none. Contenu non affiché mais lisible par les lecteurs d'écrans. */
      .hidden {
        position: absolute;
        left: 0;
        top: -5000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      caption.hidden {
        position: static;
        text-indent: -5000px;
      }

      /* Géolocalisation dynamique */
      .img_toggle div, .img_toggle table, .img_toggle ul {
        margin: 0 auto !important;
      }
      .img_toggle .geobox {
        position: relative
      }
      .img_toggle .geopoint {
        position: absolute;
        width: 5px;
        height: 5px;
        font-size: 1px;
        border: 1px solid #000;
        background: #f00;
      }

      /* Gallery */
      ul.gallery {
        margin: 2px auto;
        text-align: center;
      }
      .gallerytext {
        text-align: left;
        font-size: 89%;
      }
      .mw-gallery-slideshow-caption .gallerytext {
        text-align: center;
      }
      .image-border img {
        border: 1px solid #c8ccd1;
      }

      /* Classes pour modèles de sommaires allégés */
      .toc_niveau_1 ul ul,
      .toc_niveau_2 ul ul ul,
      .toc_niveau_3 ul ul ul ul,
      .toc_niveau_4 ul ul ul ul ul,
      .toc_niveau_5 ul ul ul ul ul ul {
        display: none;
      }

      .mw-textarea-protected {
        border: 2px solid #ff0000;
        color: navy;
      }

      /* Éditeur visuel : adaptation des messages d'avertissement */
      .ve-ui-mwSaveDialog #cpwarn {
        background: none;
        color: #111;
        padding: 3px;
      }
      .ve-ui-mwSaveDialog #avertissement-filtre {
        background: none;
        border: none;
        margin: 0;
        padding: 0;
      }
      .ve-ui-mwSaveDialog .grosse-icone {
        background: none;
        padding: 0;
      }
      .ve-ui-mwSaveDialog .bandeau-icone {
        display: none;
      }

      /* Aide et accueil */
      .aa-bloc-tete { /* Messages système */
        display: table;
        width: 100%;
        margin-bottom: 1em;
      }
      .aa-bloc-gauche,
      .aa-bloc-droite {
        display: table;
        vertical-align: middle;
        margin-bottom: 1em;
      }
      .aa-bloc-tete .aa-bloc-gauche,
      .aa-bloc-tete .aa-bloc-droite {
        display: table-cell;
        margin-bottom: 0;
      }
      .ve-ui-mwNoticesPopupTool-item .aa-bloc-gauche,
      .ve-ui-mwNoticesPopupTool-item .aa-bloc-droite,
      .ve-ui-mwNoticesPopupTool-item .aa-bloc-tete .aa-bloc-gauche,
      .ve-ui-mwNoticesPopupTool-item .aa-bloc-tete .aa-bloc-droite {
        display: block;
        float: none;
      }
      .ve-ui-mwNoticesPopupTool-item .aa-bloc-gauche .boutons-action,
      .ve-ui-mwNoticesPopupTool-item .aa-bloc-droite.aa-rechercher-autres-wikis {
        display: none;
      }
      .aa-bloc-droite {
        width: 30%;
      }
      .aa-bloc-dessous {
        padding: 5px 10px;
      }
      .aa-bloc-tete h2 {
        margin-top: 4pt; /* Correction du style des titres par défaut pour une meilleure intégration */
      }
      /* Couleur et apparence des éléments */
      .aa-fond-gris {
        background-color: #f6f6f6;
        padding: 10px;
      }
      .aa-filet-gris {
        border: 1px solid #ccc;
        border-left-width: 6px;
      }
      .aa-filet-bleu {
        border: 0 solid #3366cc;
        border-left-width: 6px;
      }
      .aa-filet-orange {
        border: 0 solid #f16633;
        border-left-width: 6px;
      }
      .aa-filet-rouge {
        border: 0 solid #d33;
        border-left-width: 6px;
      }
      .aa-fond-blanc {
        background-color: #fff;
        padding: 10px;
      }
      .aa-fond-avertissement {
        display: block;
        border-bottom: 1px solid #c00;
        background-color: #fff;
        padding: 10px;
      }
      .aa-titre-bleu {
        color: #3366bb;
        border: none;
      }
      .aa-titre-rouge {
        color: #c00;
        border: none;
      }
      .aa-titre-vert {
        color: #008769;
        border: none;
      }
      .aa-incipit {
        font-family: sans-serif;
        font-weight: bold;
        font-size: 1.5em;
        line-height: 1.3;
      }
      .aa-intertitre {
        font-family: sans-serif;
        font-weight: bold;
        font-size: 1.17em;
      }
      .aa-faux-h2 {
        font-weight: normal;
        font-size: 1.5em;
        line-height: 1.3;
      }
      .aa-faux-h3 {
        font-weight: normal;
        font-size: 1.17em;
      }
      .aa-en-tete-aide-largeur {
        max-width: 1000px;
      }
      .aa-en-tete-aide-droite {
        width: 140px;
        float: right;
        background: #fff;
        padding: 6px;
        margin-left: 20px;
        font-size: 0.9em;
      }
      .aa-en-tete-aide-ariane {
        font-size: 0.9em;
        display: block;
        margin: 0 0 5px 10px;
        padding: 5px 5px 5px 0;
      }
      .aa-en-tete-aide-chapo {
        margin: 10px;
        margin-right: 166px;
      }
      .aa-en-tete-aide-petit {
        font-size: 0.9em;
      }
      .aa-couleur-aide {
        color: #ff5d00;
      }
      .aa-couleur-niveau-avance {
        padding: 3px;
        color: #fff;
        background: #347bff;
      }
      .aa-couleur-niveau-expert {
        padding: 3px;
        color: #fff;
        background: #d11813;
      }
      .aa-couleur-niveau-debutant {
        padding: 3px;
        color: #fff;
        background: #00af89;
      }
      .aa-en-tete-aide-statut {
        background: none repeat scroll 0 0 #ffe7db;
        padding: 3px;
      }

      /* Migrated from [[MediaWiki:Cite references prefix]] */
      ol.references {
        font-size: 85%;
      }

      /* T156351: Support for Parsoid's Cite implementation */
      .mw-ref > a::after {
        content: counter(mw-Ref,decimal);
      }
      .mw-ref > a[data-mw-group]::after {
        content: attr(data-mw-group) ' ' counter(mw-Ref,decimal);
      }
      .mw-ref > a[data-mw-group=decimal]::after {
          content: counter( mw-Ref, decimal );
      }
      .mw-ref > a[data-mw-group=alpha]::after {
          content: counter( mw-Ref, lower-alpha );
      }
      .mw-ref > a[data-mw-group=grec]::after {
          content: counter( mw-Ref, lower-greek );
      }
      .mw-ref > a[data-mw-group=romain]::after {
          content: counter( mw-Ref, lower-roman );
      }
      span[rel="mw:referencedBy"] {
          counter-reset: mw-ref-linkback 0;
      }
      span[rel="mw:referencedBy"] > a::before {
          content: counter( mw-ref-linkback, lower-alpha );
      }
      span[rel="mw:referencedBy"] > a::after {
          font-size: smaller;
      }
      span[rel="mw:referencedBy"] > a:nth-last-child(2)::after {
          vertical-align: super;
          content: " et ";
      }

      q {
        quotes: "«\a0" "\a0»";
        font: inherit;
      }

      /* WP:DIMS reprise style CSS ancien Vector, utilisé sur un grand nombre d'articles */
      .toccolours, .cadre-gris-clair {
        border: 1px solid #a2a9b1;
        background-color: #f8f9fa;
        padding: 5px;
        font-size: 95%;
      }

      /* Mettez tout ce que vous voulez ajouter pour l'ensemble du site au-dessus du commentaire TemplateStyles ci-dessus. */
            /* Hide "Notice" popup */
            .oo-ui-widget.oo-ui-widget-enabled.oo-ui-labelElement.oo-ui-floatableElement-floatable.oo-ui-popupWidget-anchored.oo-ui-popupWidget.oo-ui-popupTool-popup.oo-ui-popupWidget-anchored-top {
              display: none !important;
            }
            /* Hide "Notice" button in toolbar */
            .ve-ui-toolbar-group-notices {
              display: none !important;
            }
            /* Hide "Warning to log in" in edit source */
            .mw-message-box-warning.mw-anon-edit-warning.mw-message-box {
              display: none !important;
            }
            /* Hide "Search bar" in edit source */
            .vector-search-box-vue.vector-search-box-collapses.vector-search-box-show-thumbnail.vector-search-box-auto-expand-width.vector-search-box {
              display: none !important;
            }
            /* Hide footer-places */
            #footer-places {
              display: none !important;
            }
            /* Hide header */
            .mw-header {
              display: none !important;
            }
            /* Keep sticky header's title & TOC */
            .vector-sticky-header-end,
            .vector-sticky-header-start > :not(.vector-sticky-header-context-bar) {
              display: none !important;
            }
            .vector-sticky-header-context-bar {
              border-left: none !important;
            }
            /* Hide Menu */
            .vector-main-menu-landmark {
              display: none !important;
            }
            /* Hide right bar (Tools) */
            .vector-column-end {
              display: none !important;
            }
            /* Hide "Add Languages" button */
            #p-lang-btn {
              display: none !important;
            }
            /* Hide fullscreen button */
            #p-dock-bottom {
              display: none !important;
            }
            /* Hide save dialog's licence */
            .ve-ui-mwSaveDialog-foot {
              display: none !important;
            }
            /* Keep "Comment" Label */
            .oo-ui-tool-name-comment > a {
              padding-top: 11px !important;
            }
            .oo-ui-tool-name-comment > a > .oo-ui-tool-title {
              display: block !important;
              padding-bottom: 11px !important;
              padding-right: 11px !important;
            }
            /* Hide user guide & feedback in "?" */
            .oo-ui-tool-name-mwFeedbackDialog.oo-ui-tool-name-mwUserGuide {
              display: none !important;
            }
            /* Hide some of "Help" elements */
            .oo-ui-tool-name-mwUserGuide,
            .oo-ui-tool-name-mwFeedbackDialog {
              display: none !important;
            }
            /* Hide Edit section that is next to each paragraph title */
            .mw-editsection {
              display: none !important;
            }
            /* Hide toolbar */
            .vector-page-toolbar {
              display: none !important;
            }
      ```
      </details>


    - <details> <summary> common.js [EN]</code> </summary>

      ```js
      /**
      * Keep code in MediaWiki:Common.js to a minimum as it is unconditionally
      * loaded for all users on every wiki page. If possible create a gadget that is
      * enabled by default instead of adding it here (since gadgets are fully
      * optimized ResourceLoader modules with possibility to add dependencies etc.)
      *
      * Since Common.js isn't a gadget, there is no place to declare its
      * dependencies, so we have to lazy load them with mw.loader.using on demand and
      * then execute the rest in the callback. In most cases these dependencies will
      * be loaded (or loading) already and the callback will not be delayed. In case a
      * dependency hasn't arrived yet it'll make sure those are loaded before this.
      */

      /* global mw, $ */
      /* jshint strict:false, browser:true */

      mw.loader.using( [ 'mediawiki.util' ] ).done( function () {
        /* Begin of mw.loader.using callback */

        /**
        * Map addPortletLink to mw.util
        * @deprecated: Use mw.util.addPortletLink instead.
        */
        mw.log.deprecate( window, 'addPortletLink', mw.util.addPortletLink, 'Use mw.util.addPortletLink instead' );

        /**
        * Test if an element has a certain class
        * @deprecated:  Use $(element).hasClass() instead.
        */
        mw.log.deprecate( window, 'hasClass', function ( element, className ) {
          return $( element ).hasClass( className );
        }, 'Use jQuery.hasClass() instead' );

        /**
        * @source www.mediawiki.org/wiki/Snippets/Load_JS_and_CSS_by_URL
        * @rev 6
        */
        var extraCSS = mw.util.getParamValue( 'withCSS' ),
          extraJS = mw.util.getParamValue( 'withJS' );

        if ( extraCSS ) {
          if ( extraCSS.match( /^MediaWiki:[^&<>=%#]*\.css$/ ) ) {
            mw.loader.load( '/w/index.php?title=' + extraCSS + '&action=raw&ctype=text/css', 'text/css' );
          } else {
            mw.notify( 'Only pages from the MediaWiki namespace are allowed.', { title: 'Invalid withCSS value' } );
          }
        }

        if ( extraJS ) {
          if ( extraJS.match( /^MediaWiki:[^&<>=%#]*\.js$/ ) ) {
            mw.loader.load( '/w/index.php?title=' + extraJS + '&action=raw&ctype=text/javascript' );
          } else {
            mw.notify( 'Only pages from the MediaWiki namespace are allowed.', { title: 'Invalid withJS value' } );
          }
        }

        /**
        * WikiMiniAtlas
        *
        * Description: WikiMiniAtlas is a popup click and drag world map.
        *              This script causes all of our coordinate links to display the WikiMiniAtlas popup button.
        *              The script itself is located on the Meta-Wiki because it is used by many projects.
        *              See [[Meta:WikiMiniAtlas]] for more information.
        * Note - use of this service is recommended to be replaced with mw:Help:Extension:Kartographer
        */
        $( function () {
          var requireWikiminiatlas = $( 'a.external.text[href*="geohack"]' ).length || $( 'div.kmldata' ).length;
          if ( requireWikiminiatlas ) {
            mw.loader.load( '//meta.wikimedia.org/w/index.php?title=MediaWiki:Wikiminiatlas.js&action=raw&ctype=text/javascript' );
          }
        } );

        /**
        * Collapsible tables; reimplemented with mw-collapsible
        * Styling is also in place to avoid FOUC
        *
        * Allows tables to be collapsed, showing only the header. See [[Help:Collapsing]].
        * @version 3.0.0 (2018-05-20)
        * @source https://www.mediawiki.org/wiki/MediaWiki:Gadget-collapsibleTables.js
        * @author [[User:R. Koot]]
        * @author [[User:Krinkle]]
        * @author [[User:TheDJ]]
        * @deprecated Since MediaWiki 1.20: Use class="mw-collapsible" instead which
        * is supported in MediaWiki core. Shimmable since MediaWiki 1.32
        *
        * @param {jQuery} $content
        */
        function makeCollapsibleMwCollapsible( $content ) {
          var $tables = $content
            .find( 'table.collapsible:not(.mw-collapsible)' )
            .addClass( 'mw-collapsible' );

          $.each( $tables, function ( index, table ) {
            // mw.log.warn( 'This page is using the deprecated class collapsible. Please replace it with mw-collapsible.');
            if ( $( table ).hasClass( 'collapsed' ) ) {
              $( table ).addClass( 'mw-collapsed' );
              // mw.log.warn( 'This page is using the deprecated class collapsed. Please replace it with mw-collapsed.');
            }
          } );
          if ( $tables.length > 0 ) {
            mw.loader.using( 'jquery.makeCollapsible' ).then( function () {
              $tables.makeCollapsible();
            } );
          }
        }
        mw.hook( 'wikipage.content' ).add( makeCollapsibleMwCollapsible );

        /**
        * Add support to mw-collapsible for autocollapse, innercollapse and outercollapse
        *
        * Maintainers: TheDJ
        */
        function mwCollapsibleSetup( $collapsibleContent ) {
          var $element,
            $toggle,
            autoCollapseThreshold = 2;
          $.each( $collapsibleContent, function ( index, element ) {
            $element = $( element );
            if ( $element.hasClass( 'collapsible' ) ) {
              $element.find( 'tr:first > th:first' ).prepend( $element.find( 'tr:first > * > .mw-collapsible-toggle' ) );
            }
            if ( $collapsibleContent.length >= autoCollapseThreshold && $element.hasClass( 'autocollapse' ) ) {
              $element.data( 'mw-collapsible' ).collapse();
            } else if ( $element.hasClass( 'innercollapse' ) ) {
              if ( $element.parents( '.outercollapse' ).length > 0 ) {
                $element.data( 'mw-collapsible' ).collapse();
              }
            }
            // because of colored backgrounds, style the link in the text color
            // to ensure accessible contrast
            $toggle = $element.find( '.mw-collapsible-toggle' );
            if ( $toggle.length ) {
              // Make the toggle inherit text color (Updated for T333357 2023-04-29)
              if ( $toggle.parent()[ 0 ].style.color ) {
                $toggle.css( 'color', 'inherit' );
                $toggle.find( '.mw-collapsible-text' ).css( 'color', 'inherit' );
              }
            }
          } );
        }

        mw.hook( 'wikipage.collapsibleContent' ).add( mwCollapsibleSetup );

        /**
        * Magic editintros ****************************************************
        *
        * Description: Adds editintros on disambiguation pages and BLP pages.
        * Maintainers: [[User:RockMFR]]
        *
        * @param {string} name
        */
        function addEditIntro( name ) {
          $( '.mw-editsection, #ca-edit, #ca-ve-edit' ).find( 'a' ).each( function ( i, el ) {
            el.href = $( this ).attr( 'href' ) + '&editintro=' + name;
          } );
        }

        if ( mw.config.get( 'wgNamespaceNumber' ) === 0 ) {
          $( function () {
            if ( document.getElementById( 'disambigbox' ) ) {
              addEditIntro( 'Template:Disambig_editintro' );
            }
          } );

          $( function () {
            var cats = mw.config.get( 'wgCategories' );
            if ( !cats ) {
              return;
            }
            if ( $.inArray( 'Living people', cats ) !== -1 || $.inArray( 'Possibly living people', cats ) !== -1 ) {
              addEditIntro( 'Template:BLP_editintro' );
            }
          } );
        }
        /* End of mw.loader.using callback */

            // Add a stylesheet rule when Iframe (Editor)
            const isIframe = window.location !== window.parent.location;
            var iframeCssRules = mw.util.addCSS(
              `/*  Hide Header when Iframe / Editor. */
              .vector-column-start,
              .vector-page-titlebar {
                display: none !important;
              }`
            );
            iframeCssRules.disabled = !isIframe;

            /**
            * Gets diffHtml
            */
            mw.loader.using(['mediawiki.util'], function () {
              mw.hook('wikipage.diff').add(function ($diff) {
                // Has param "wikiadviser"
                const urlParams = new URLSearchParams(window.location.search);
                if (!urlParams.has('wikiadviser')) return;

                elementReady('.ve-init-mw-diffPage-diff').then(function (diffEl) {
                  const diffHtml = diffEl.outerHTML;
                  const articleId = mw.config.get('wgPageName');
                  if (isIframe){
                    window.parent.postMessage(
                      {
                        type: 'diff-change',
                        articleId: articleId,
                        diffHtml: diffHtml
                      },
                      '*'
                    );
                  }
                });
              });
            });

            /**
            * Waits for a selector to appear in document.documentElement,
            * resolving with the element once it's in the DOM.
            * Uses MutationObserver under the hood.
            *
            * @param {string} selector
            * @returns {Promise<Element>}
            */
            function elementReady(selector) {
              return new Promise(function (resolve) {
                var el = document.querySelector(selector);
                if (el) {
                  resolve(el);
                  return;
                }
                var observer = new MutationObserver(function (mutationRecords, obs) {
                  var found = document.querySelector(selector);
                  if (found) {
                    obs.disconnect();
                    resolve(found);
                  }
                });
                // Watch for additions anywhere in the document
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true
                });
              });
            }

            // Listen for messages from parent (wikiadviser)
            window.addEventListener('message', function(event) {
              if (event.data && event.data.type === 'wikiadviser') {
                console.log('Received Wikiadviser event:', event.data);
                if (event.data.data === 'diff') {
                  mw.wikiadviser.getDiffUrl(event.data.articleId)
                      .then(function(diffUrl) {
                          console.log('Redirecting to diff:', diffUrl);
                          window.location.replace(diffUrl);
                      })
                      .catch(function(error) {
                        console.error('Failed to redirect to diff:', error);
                      });
                }
              }
            });

            // Define wikiadviser utilities on mw object
            mw.wikiadviser = {
                /**
                * Get diff URL between oldest and newest revisions
                * @param {string} articleId Page title
                * @returns {Promise<string>} Promise resolving to diff URL
                */
                getDiffUrl: function(articleId) {
                    const self = this;
                    const mediawikiBaseURL = mw.config.get("wgServer") + mw.config.get("wgScriptPath");
                    
                    return Promise.all([
                        self.getRevisionData(articleId, 'newer'),
                        self.getRevisionData(articleId, 'older')
                    ]).then(function(results) {
                        const originalRevid = results[0].revid;
                        const latestRevid = results[1].revid;
                        return `${mediawikiBaseURL}/index.php?title=${articleId}&diff=${latestRevid}&oldid=${originalRevid}&diffmode=visual&diffonly=1&wikiadviser`;
                    });
                },

                /**
                * Fetch revision data from API
                * @param {string} articleId Page title
                * @param {string} sort 'newer' or 'older'
                * @returns {Promise<Object>} Promise resolving to revision data
                */
                getRevisionData: function(articleId, sort) {
                    const api = new mw.Api();
                    return api.get({
                        action: 'query',
                        prop: 'revisions',
                        titles: articleId,
                        rvlimit: 1,
                        rvdir: sort,
                        formatversion: 2
                    }).then(function(data) {
                        return data.query.pages[0].revisions[0];
                    });
                }
            };
      } );
      /* DO NOT ADD CODE BELOW THIS LINE */

      ```
      </details>


    - <details> <summary> common.js [FR]</code> </summary>

      ```js
            /* jshint scripturl: true, laxbreak: true */
      /* eslint-env browser */
      /* globals WeakMap, mw, $, importScript, realAddSpecialCharset, realAddSpecialCharsetHTML, MonobookToolbar, Diaporama_Init, CadreOnglets_Init */
      /* exported obtenir, addSpecialCharset, addSpecialCharsetHTML, addCustomButton */
      
      /**
       * N'importe quel JavaScript ici sera chargé pour n'importe quel utilisateur et pour chaque page accédée.
       *
       * ATTENTION : Avant de modifier cette page, veuillez tester vos changements avec votre propre
       * vector.js. Une erreur sur cette page peut faire bugger le site entier (et gêner l'ensemble des
       * visiteurs), même plusieurs heures après la modification !
       *
       * Prière de ranger les nouvelles fonctions dans les sections adaptées :
       * - Fonctions JavaScript
       * - Fonctions spécifiques pour MediaWiki
       * - Applications spécifiques à la fenêtre d'édition
       * - Applications qui peuvent être utilisées sur toute page
       * - Applications spécifiques à un espace de nom ou une page
       *
       * <nowiki> /!\ Ne pas retirer cette balise
       */
      
      (function () { // Encapsulation de tout le code dans une IIFE globale
      
      /***********************/
      /* Fonctions générales */
      /***********************/
      
      /**
       * Projet JavaScript
       */
      window.obtenir = function ( name ) {
      	if ( mw.loader.getState( 'ext.gadget.' + name ) !== null ) {
      		mw.loader.load( 'ext.gadget.' + name );
      	} else {
      		importScript( 'MediaWiki:Gadget-' + name + '.js' );
      	}
      };
      
      /**
       * Transformer les pages du Bistro, du BA et les pages spécifiées en page de discussion
       */
      if ( mw.config.get( 'wgNamespaceNumber' ) >= 2 && mw.config.get( 'wgNamespaceNumber' ) % 2 === 0 ) {
      	$( function ( $ ) { // eslint-disable-line no-unused-vars
      		var alwaysTransform = ( function () {
      			var pageName = mw.config.get( 'wgPageName' );
      			var basePages = [
      				'Wikipédia:Le_Bistro',
      				'Wikipédia:Bulletin_des_administrateurs',
      				'Wikipédia:Questions_techniques',
      				'Wikipédia:Demande_d\'intervention_sur_un_message_système',
      				'Wikipédia:Bot/Requêtes',
      			];
      			return mw.config.get( 'wgNamespaceNumber' ) === 4 && basePages.some( function ( basePage ) {
      				return pageName === basePage || pageName.startsWith( basePage + '/' );
      			} );
      		} )();
      		if ( alwaysTransform ) {
      			document.body.classList.replace( 'ns-subject', 'ns-talk' );
      		} else {
      			mw.hook( 'wikipage.content' ).add( function ( $content ) { // eslint-disable-line no-unused-vars
      				if ( document.getElementById( 'transformeEnPageDeDiscussion' ) ) {
      					document.body.classList.replace( 'ns-subject', 'ns-talk' );
      				} else {
      					document.body.classList.replace( 'ns-talk', 'ns-subject' );
      				}
      			} );
      		}
      	} );
      }
      
      
      /****************************************/
      /* Applications pour l'ensemble du site */
      /****************************************/
      
      /**
       * Tout ce qui concerne la page d'édition
       */
      if ( [ 'edit', 'submit' ].includes( mw.config.get( 'wgAction' ) ) ) {
      
      	// chargement de [[MediaWiki:Gadget-CommonEdit.js]]
      	mw.loader.load( 'ext.gadget.CommonEdit' );
      
      	// pour que les fonctions soient définies dès maintenant,
      	// mais l'exécution réelle ne se fait qu'une fois le module chargé
      	window.addSpecialCharset = function ( title, chars ) {
      		mw.loader.using( 'ext.gadget.CommonEdit', function () {
      			realAddSpecialCharset( title, chars );
      		} );
      	};
      	window.addSpecialCharsetHTML = function ( title, charsHTML ) {
      		mw.loader.using( 'ext.gadget.CommonEdit', function () {
      			realAddSpecialCharsetHTML( title, charsHTML );
      		} );
      	};
      
      	// fonction pour ajouter un bouton à la fin de la barre d'outils
      	// permet d'utiliser [[MediaWiki:Gadget-MonobookToolbar.js]] sans se préoccuper de son chargement
      	window.addCustomButton = ( function () {
      		var promise;
      
      		return function () {
      			var buttonArguments = arguments;
      
      			if ( !promise ) {
      				promise = mw.loader.using( 'ext.gadget.MonobookToolbar' );
      			}
      
      			promise.done( function () {
      				MonobookToolbar.addButton.apply( MonobookToolbar, buttonArguments );
      			} );
      		};
      	} )();
      
      } else {
      	// pour que les fonctions soient toujours définies,
      	// afin d'éviter aux scripts utilisateur de planter
      	window.addSpecialCharset = function () {};
      	window.addSpecialCharsetHTML = function () {};
      	window.addCustomButton = function () {};
      }
      
      /**
       * Réécriture des titres
       *
       * Fonction utilisée par [[Modèle:Titre incorrect]]
       *
       * La fonction cherche un bandeau de la forme
       * <div id="RealTitleBanner">
       *   <span id="RealTitle">titre</span>
       * </div>
       *
       * Un élément comportant id="DisableRealTitle" désactive la fonction
       */
      function rewritePageTitle( $ ) {
      	var $realTitle, titleHtml, $h1, $header,
      		$realTitleBanner = $( '#RealTitleBanner' );
      	if ( $realTitleBanner.length && !$( '#DisableRealTitle' ).length ) {
      		$realTitle = $( '#RealTitle' );
      		$h1 = $( '.mw-first-heading' );
      		if ( mw.config.get( 'skin' ) === 'vector-2022' ) {
      			$header = $( '.mw-body-header' );
      		} else {
      			$header = $h1;
      		}
      		if ( $realTitle.length && $h1.length && $header.length ) {
      			titleHtml = $realTitle.html();
      			if ( titleHtml === '' ) {
      				$h1.hide();
      			} else {
      				$h1.html( titleHtml );
      				if ( mw.config.get( 'wgAction' ) === 'view' ) {
      					// using a callback for replacement, to prevent interpreting "$" characters that realTitle might contain
      					document.title = document.title.replace( /^.+( [—–-] Wikipédia)$/, function ( match, p1 ) {
      						return $realTitle.text() + p1;
      					} );
      				}
      			}
      			$realTitleBanner.hide();
      			$( '<p>' ).css( 'font-size', '80%' )
      				.append( 'Titre à utiliser pour créer un lien interne : ', $( '<b>' ).text( mw.config.get( 'wgPageName' ).replace( /_/g, ' ' ) ) )
      				.insertAfter( $header );
      		}
      	}
      }
      $( rewritePageTitle );
      
      
      /**
       * Ajout d'un sous-titre
       *
       * Fonction utilisée par [[Modèle:Sous-titre]] et quelques modules de taxobox
       *
       * La fonction cherche un élément de la forme
       * <span id="sous_titre_h1">Sous-titre</span>
       */
      
      function sousTitreH1( $content ) {
      	$( '#sous_titre_h1_moved' ).remove();
      	var $span = $content.find( '#sous_titre_h1' );
      	if ( $span.length ) {
      		$span.attr( 'id', 'sous_titre_h1_moved' );
      		$span.prepend( ' ' );
      		$( '.mw-first-heading' ).append( $span );
      	}
      }
      mw.hook( 'wikipage.content' ).add( sousTitreH1 );
      
      
      /**
       * Boîtes déroulantes
       *
       * Pour [[Modèle:Méta palette de navigation]]
       */
      
      var Palette_Derouler = '[afficher]';
      var Palette_Enrouler = '[masquer]';
      
      var Palette_max = 1;
      
      function Palette_toggle( $table ) {
      	/*
      	direct children, car il ne faut pas prendre les lignes des éventuelles tables imbriquées
      	table > tbody (peut-être aussi thead à l'avenir) > tr
      
      	ensuite, on applique à toutes les lignes sauf la première
      	*/
      	$table.children().children( 'tr' ).slice( 1 ).toggleClass( 'navboxHidden' );
      }
      
      function Palette( $content ) {
      	var tableToGroup = new WeakMap();
      	var groupLengths = new WeakMap();
      
      	var $tables = $content.find( '.collapsible' );
      
      	$tables.each( function ( _, table ) {
      		var group = table.parentNode.closest( '.navbox-container, .collapsible' );
      		if ( group ) {
      			tableToGroup.set( table, group );
      			groupLengths.set( group, ( groupLengths.get( group ) || 0 ) + 1 );
      		}
      	} );
      
      	$tables.each( function ( _, table ) {
      		var $table = $( table );
      
      		var collapsed = false;
      		if ( table.classList.contains( 'autocollapse' ) ) {
      			var group = tableToGroup.get( table );
      			if ( group && groupLengths.get( group ) > Palette_max ) {
      				collapsed = true;
      			}
      		} else if ( table.classList.contains( 'collapsed' ) ) {
      			collapsed = true;
      		}
      
      		// le modèle dispose d'une classe "navbox-title",
      		// sauf que les palettes "inlinées" (e.g. « class="navbox collapsible collapsed" ») n'ont pas cette classe
      		$table.find( 'tr' ).eq( 0 ).find( 'th' ).eq( 0 ).prepend(
      			$( '<span class="navboxToggle">\xA0</span>' ).append(
      				$( '<a href="javascript:">' + ( collapsed ? Palette_Derouler : Palette_Enrouler ) + '</a>' ).click( function ( e ) {
      					e.preventDefault();
      					if ( this.textContent === Palette_Enrouler ) {
      						this.textContent = Palette_Derouler;
      					} else {
      						this.textContent = Palette_Enrouler;
      					}
      					Palette_toggle( $table );
      				} )
      			)
      		);
      		if ( collapsed ) {
      			Palette_toggle( $table );
      		}
      	} );
      
      	// for garbage collection
      	tableToGroup = null;
      	groupLengths = null;
      	$tables = null;
      
      	// permet de dérouler/enrouler les palettes en cliquant n'importe où sur l'entête
      	// (utilisation de la classe "navbox-title", comme ça seules les vraies palettes utilisant le modèle sont ciblées)
      	$content.find( '.navbox-title' )
      		.click( function ( e ) {
      			if ( e.target.closest( 'a' ) ) {
      				return;
      			}
      			$( this ).find( '.navboxToggle a' ).click();
      		} )
      		.css( 'cursor', 'pointer' );
      }
      mw.hook( 'wikipage.content' ).add( Palette );
      
      
      /**
       * Pour [[Modèle:Boîte déroulante]]
       */
      
      var BoiteDeroulante_Derouler = '[afficher]';
      var BoiteDeroulante_Enrouler = '[masquer]';
      
      function BoiteDeroulante_toggle( NavToggle ) {
      	var NavFrame = NavToggle.parentNode;
      
      	var caption = [];
      	caption[ 0 ] = NavFrame.dataset.boiteDeroulanteDerouler;
      	caption[ 1 ] = NavFrame.dataset.boiteDeroulanteEnrouler;
      
      	var $NavContent = $( NavFrame ).find( '.NavContent' ).eq( 0 );
      
      	if ( NavToggle.textContent === caption[ 1 ] ) {
      		NavToggle.textContent = caption[ 0 ];
      		$NavContent.hide();
      	} else {
      		NavToggle.textContent = caption[ 1 ];
      		$NavContent.show();
      	}
      }
      
      function BoiteDeroulante( $content ) {
      
      	$content.find( '.NavFrame' ).each( function ( _, NavFrame ) {
      		var CustomTexts, Derouler, Enrouler, NavToggle;
      
      		if ( NavFrame.title && NavFrame.title.indexOf( '/' ) !== -1 ) {
      			CustomTexts = NavFrame.title.split( '/' );
      			Derouler = CustomTexts[ 0 ];
      			Enrouler = CustomTexts[ 1 ];
      		} else {
      			Derouler = BoiteDeroulante_Derouler;
      			Enrouler = BoiteDeroulante_Enrouler;
      		}
      		NavFrame.title = '';
      		NavFrame.dataset.boiteDeroulanteDerouler = Derouler;
      		NavFrame.dataset.boiteDeroulanteEnrouler = Enrouler;
      
      		NavToggle = document.createElement( 'a' );
      		NavToggle.className = 'NavToggle';
      		NavToggle.href = 'javascript:';
      		NavToggle.onclick = function ( e ) {
      			e.preventDefault();
      			BoiteDeroulante_toggle( e.target );
      		};
      		NavToggle.textContent = Enrouler;
      
      		NavFrame.insertBefore( NavToggle, NavFrame.firstChild );
      
      		BoiteDeroulante_toggle( NavToggle );
      	} );
      
      	// permet de dérouler/enrouler les boîtes en cliquant n'importe où sur l'entête
      	$content.find( '.NavHead' )
      		.click( function ( e ) {
      			if ( e.target.closest( 'a' ) ) {
      				return;
      			}
      			var toggle = $( this ).siblings( 'a.NavToggle' )[ 0 ];
      			if ( toggle ) {
      				toggle.click(); // pas du jquery, mais du vanilla js
      			}
      		} )
      		.css( 'cursor', 'pointer' );
      }
      
      mw.hook( 'wikipage.content' ).add( BoiteDeroulante );
      
      
      /**
       * Fonctionnement du [[Modèle:Animation]]
       * Le JavaScript principal se situe dans [[MediaWiki:Gadget-Diaporama.js]]
       */
      mw.hook( 'wikipage.content' ).add( function ( $content ) {
      	if ( $content.find( '.diaporama' ).length ) {
      		mw.loader.using( 'ext.gadget.Diaporama', function () {
      			Diaporama_Init( $content );
      		} );
      	}
      } );
      
      
      /**
       * Permet d'afficher les catégories cachées pour les contributeurs enregistrés, en ajoutant un (+) à la manière des boîtes déroulantes
       */
      function hiddencat( $ ) {
      	if ( mw.util.getParamValue( 'printable' ) === 'yes' ) {
      		return;
      	}
      	var cl = document.getElementById( 'catlinks' );
      	if ( !cl ) {
      		return;
      	}
      	var $hc = $( '#mw-hidden-catlinks' );
      	if ( !$hc.length ) {
      		return;
      	}
      	if ( $hc.hasClass( 'mw-hidden-cats-user-shown' ) ) {
      		return;
      	}
      	if ( $hc.hasClass( 'mw-hidden-cats-ns-shown' ) ) {
      		$hc.addClass( 'mw-hidden-cats-hidden' );
      	}
      	var nc = document.getElementById( 'mw-normal-catlinks' );
      	if ( !nc ) {
      		var catline = document.createElement( 'div' );
      		catline.id = 'mw-normal-catlinks';
      		var a = document.createElement( 'a' );
      		a.href = '/wiki/Catégorie:Accueil';
      		a.title = 'Catégorie:Accueil';
      		a.textContent = 'Catégories';
      		catline.appendChild( a );
      		catline.appendChild( document.createTextNode( ' : ' ) );
      		nc = cl.insertBefore( catline, cl.firstChild );
      	}
      	var lnk = document.createElement( 'a' );
      	lnk.id = 'mw-hidden-cats-link';
      	lnk.title = 'Cet article contient des catégories cachées';
      	lnk.style.cursor = 'pointer';
      	lnk.style.color = 'black';
      	lnk.style.marginLeft = '0.3em';
      	$( lnk ).click( toggleHiddenCats );
      	lnk.textContent = '[+]';
      	nc.appendChild( lnk );
      }
      
      function toggleHiddenCats( e ) {
      	var $hc = $( '#mw-hidden-catlinks' );
      	if ( $hc.hasClass( 'mw-hidden-cats-hidden' ) ) {
      		$hc.removeClass( 'mw-hidden-cats-hidden' );
      		$hc.addClass( 'mw-hidden-cat-user-shown' );
      		e.target.textContent = '[–]';
      	} else {
      		$hc.removeClass( 'mw-hidden-cat-user-shown' );
      		$hc.addClass( 'mw-hidden-cats-hidden' );
      		e.target.textContent = '[+]';
      	}
      }
      
      mw.loader.using( 'mediawiki.util', function () {
      	$( hiddencat );
      } );
      
      
      /**
       * Script pour alterner entre plusieurs cartes de géolocalisation
       */
      
      function GeoBox_Init( $content ) {
      	// noter qu'une classe "imgtoggle" (sans l'underscore) est aussi présente sur le wiki, sans rapport avec celle-ci
      	$content.find( '.img_toggle' ).each( function ( i, Container ) {
      		Container.id = 'img_toggle_' + i;
      		var Boxes = $( Container ).find( '.geobox' );
      		if ( Boxes.length < 2 ) {
      			return;
      		}
      		var ToggleLinksDiv = document.createElement( 'ul' );
      		ToggleLinksDiv.id = 'geoboxToggleLinks_' + i;
      		Boxes.each( function ( a, ThisBox ) {
      			ThisBox.id = 'geobox_' + i + '_' + a;
      			var ThisAlt;
      			var ThisImg = ThisBox.getElementsByTagName( 'img' )[ 0 ];
      			if ( ThisImg ) {
      				ThisAlt = ThisImg.alt;
      			}
      			if ( !ThisAlt ) {
      				ThisAlt = 'erreur : description non trouvée';
      			}
      			var toggle = document.createElement( 'a' );
      			toggle.id = 'geoboxToggle_' + i + '_' + a;
      			toggle.textContent = ThisAlt;
      			toggle.href = 'javascript:';
      			toggle.onclick = function ( e ) {
      				e.preventDefault();
      				GeoBox_Toggle( this );
      			};
      			var Li = document.createElement( 'li' );
      			Li.appendChild( toggle );
      			ToggleLinksDiv.appendChild( Li );
      			if ( a === 0 ) {
      				toggle.style.color = '#888';
      				toggle.style.pointerEvents = 'none';
      			} else {
      				ThisBox.style.display = 'none';
      			}
      		} );
      		Container.appendChild( ToggleLinksDiv );
      	} );
      }
      
      function GeoBox_Toggle( link ) {
      	var ImgToggleIndex = link.id.replace( 'geoboxToggle_', '' ).replace( /_.*/g, '' );
      	var GeoBoxIndex = link.id.replace( /.*_/g, '' );
      	var ImageToggle = document.getElementById( 'img_toggle_' + ImgToggleIndex );
      	var Links = document.getElementById( 'geoboxToggleLinks_' + ImgToggleIndex );
      	var Geobox = document.getElementById( 'geobox_' + ImgToggleIndex + '_' + GeoBoxIndex );
      	var Link = document.getElementById( 'geoboxToggle_' + ImgToggleIndex + '_' + GeoBoxIndex );
      	if ( !ImageToggle || !Links || !Geobox || !Link ) {
      		return;
      	}
      	$( ImageToggle ).find( '.geobox' ).each( function ( _, ThisgeoBox ) {
      		if ( ThisgeoBox.id === Geobox.id ) {
      			ThisgeoBox.style.display = '';
      		} else {
      			ThisgeoBox.style.display = 'none';
      		}
      	} );
      	$( Links ).find( 'a' ).each( function ( _, thisToggleLink ) {
      		if ( thisToggleLink.id === Link.id ) {
      			thisToggleLink.style.color = '#888';
      			thisToggleLink.style.pointerEvents = 'none';
      		} else {
      			thisToggleLink.style.color = '';
      			thisToggleLink.style.pointerEvents = '';
      		}
      	} );
      }
      
      mw.hook( 'wikipage.content' ).add( GeoBox_Init );
      
      
      /**
       * permet d'ajouter un petit lien (par exemple d'aide) à la fin du titre d'une page.
       * utilisé par [[Modèle:Aide contextuelle]]
       * known bug : conflit avec le changement de titre classique.
       * Pour les commentaires, merci de contacter [[user:Plyd|Plyd]].
       */
      function rewritePageH1bis() {
      	var helpPage = document.getElementById( 'helpPage' );
      	if ( helpPage ) {
      		var h1 = document.getElementsByClassName( 'mw-first-heading' )[ 0 ];
      		if ( h1 ) {
      			h1.innerHTML += '<span id="h1-helpPage">' + helpPage.innerHTML + '</span>';
      		}
      	}
      }
      $( rewritePageH1bis );
      
      /**
       * Configuration du tri des diacritique dans les tables de class "sortable"
       */
      mw.config.set( 'tableSorterCollation', {'à':'a', 'â':'a', 'æ':'ae', 'é':'e', 'è':'e', 'ê':'e', 'î':'i', 'ï':'i', 'ô':'o', 'œ':'oe', 'û':'u', 'ç':'c',  } );
      
      /**
       * Direct imagelinks to Commons
       *
       * Required modules: mediawiki.util, user.options
       *
       * @source www.mediawiki.org/wiki/Snippets/Direct_imagelinks_to_Commons
       * @author Krinkle
       * @version 2015-06-23
       * Ajouté le 'uselang' ce 18 janvier 2016 — Ltrlg
       */
      if ( mw.config.get( 'wgNamespaceNumber' ) >= 0 ) {
      	mw.loader.using( [ 'mediawiki.util', 'user.options' ], function () {
      		mw.hook( 'wikipage.content' ).add( function ( $content ) {
      			var
      				uploadBase = '//upload.wikimedia.org/wikipedia/commons/',
      
      				fileNamespace = mw.config.get( 'wgFormattedNamespaces' )[ '6' ],
      				localBasePath = new RegExp( '^' + mw.util.escapeRegExp( mw.util.getUrl( fileNamespace + ':' ) ) ),
      				localBaseScript = new RegExp( '^' + mw.util.escapeRegExp( mw.util.wikiScript() + '?title=' + mw.util.wikiUrlencode( fileNamespace + ':' ) ) ),
      
      				commonsBasePath = '//commons.wikimedia.org/wiki/File:',
      				commonsBaseScript = '//commons.wikimedia.org/w/index.php?title=File:',
      
      				lang = mw.user.options.get( 'language' );
      
      			// see [[mw:Parsoid/Parser Unification/Media structure/FAQ]]
      			$content.find( '.mw-file-description' ).each( function ( i, link ) {
      				if ( link.tagName !== 'A' ) {
      					return;
      				}
      
      				var img = link.querySelector( 'img' );
      
      				// attention : on lit l'attribut, et non la propriété (elle contient en plus le protocole)
      				// (en prime, il est plus performant dans ce cas de lire l'attribut)
      				if ( img && img.getAttribute( 'src' ).indexOf( uploadBase ) === 0 ) {
      					var currVal = link.getAttribute( 'href' );
      					if ( localBasePath.test( currVal ) ) {
      						link.setAttribute( 'href', currVal.replace( localBasePath, commonsBasePath ) + '?uselang=' + lang );
      					} else if ( localBaseScript.test( currVal ) ) {
      						link.setAttribute( 'href', currVal.replace( localBaseScript, commonsBaseScript ) + '&uselang=' + lang );
      					}
      				}
      			} );
      		} );
      	} );
      }
      
      /**
       * Ajout d'un lien « Ajouter un sujet » en bas de page
       */
      if ( mw.config.get( 'wgAction' ) === 'view' ) {
      	$( function ( $ ) {
      		var addSection = document.getElementById( 'ca-addsection' );
      		if ( !addSection ) { // pas d'onglet « Ajouter un sujet »
      			return;
      		}
      		var addSectionLink = addSection.querySelector( 'a' );
      		if ( !addSectionLink ) { // erreur : le markup a changé
      			return;
      		}
      
      		var $container = $( '<div style="text-align:right; font-size:0.9em; margin:1em 0 -0.5em" class="noprint">' );
      
      		var link = document.createElement( 'a' );
      		link.href = addSectionLink.href; // ce href sert encore, pour les middle-click, Ctrl+click... (ouverture dans un nouvel onglet)
      		link.title = addSectionLink.title;
      		link.textContent = addSectionLink.textContent;
      
      		// compatibilité avec la fonctionnalité beta "New Discussion Tool", voir [[mw:Extension:DiscussionTools]]
      		link.addEventListener( 'click', function ( e ) {
      			if ( !e.ctrlKey ) {
      				e.preventDefault();
      				addSectionLink.click(); // .click() JS natif, pour information le .click() jQuery ne fonctionne pas dans le cas présent
      			}
      		} );
      
      		$container.append( link );
      
      		$( '#mw-content-text' ).append( $container );
      	} );
      }
      
      /**
       * Repositionnement de la page sur l'ancre avec laquelle elle a été appelée
       * après le repli des boîtes déroulantes, entre autres.
       */
      if ( window.location.hash ) {
      	$( function ( $ ) { // eslint-disable-line no-unused-vars
      		setTimeout( function () {
      			var currentTarget = document.getElementById( decodeURIComponent( window.location.hash.substring( 1 ) ) );
      			if ( currentTarget ) {
      				currentTarget.scrollIntoView();
      			}
      		}, 1 );
      	} );
      }
      
      
      /*********************************************************************/
      /* Function Strictement spécifiques à un espace de nom ou à une page */
      /*********************************************************************/
      
      // ESPACE DE NOM 'SPECIAL'
      if ( mw.config.get( 'wgNamespaceNumber' ) === -1 ) {
      
      /**
       * Ajoute le namespace aux filtres personnalisés sur [[Spécial:Pages liées]]
       * Voir aussi [[MediaWiki:Linkshere]]
       */
      if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Whatlinkshere' ) {
      
      	mw.loader.using( 'mediawiki.Uri', function () {
      		$( function ( $ ) {
      
      			var query = ( new mw.Uri( null, { overrideKeys: true } ) ).query;
      
      			var append = ( query.namespace ? '&namespace=' + encodeURIComponent( query.namespace ) : '' )
      				+ ( query.invert ? '&invert=' + encodeURIComponent( query.invert ) : '' );
      
      			if ( append !== '' ) {
      				$( '#whatlinkshere-customfilters' ).find( 'a' ).each( function () {
      					this.href += append;
      				} );
      			}
      		} );
      	} );
      }
      
      /**
       * Affiche un modèle Information sur la page de téléchargement de fichiers [[Spécial:Téléchargement]]
       * Voir aussi [[MediaWiki:Onlyifuploading.js]]
       */
      if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Upload' ) {
      	importScript( 'MediaWiki:Onlyifuploading.js' );
      }
      
      } // Fin du code concernant l'espace de nom 'Special'
      
      
      // ESPACE DE NOM 'UTILISATEUR'
      if ( mw.config.get( 'wgNamespaceNumber' ) === 2 ) {
      
      /*
       * Fonctionnement du [[Modèle:Cadre à onglets]]
       * Le JavaScript principal se situe dans [[MediaWiki:Gadget-CadreOnglets.js]]
       */
      mw.hook( 'wikipage.content' ).add( function ( $content ) {
      	if ( $content.find( '.cadre_a_onglets' ).length ) {
      		mw.loader.using( 'ext.gadget.CadreOnglets', function () {
      			CadreOnglets_Init( $content );
      		} );
      	}
      } );
      
      } // Fin du code concernant l'espace de nom 'Utilisateur'
      
      
      // ESPACE DE NOM 'RÉFÉRENCE'
      if ( mw.config.get( 'wgNamespaceNumber' ) === 104 ) {
      
      /*
       * Choix du mode d'affichage des références
       * @note L'ordre de cette liste doit correspondre a celui de Modèle:Édition !
       */
      
      var addBibSubsetMenu = function ( $content ) {
      	var $specialBib = $content.find( '#specialBib' );
      	if ( !$specialBib.length ) {
      		return;
      	}
      
      	// select subsection of special characters
      	var chooseBibSubset = function ( s ) {
      		$content.find( '.edition-Liste' ).css( 'display', s === 0 ? 'block' : 'none' );
      		$content.find( '.edition-WikiNorme' ).css( 'display', s === 1 ? 'block' : 'none' );
      		$content.find( '.edition-BibTeX' ).css( 'display', s === 2 ? 'block' : 'none' );
      		$content.find( '.edition-ISBD' ).css( 'display', s === 3 ? 'block' : 'none' );
      		$content.find( '.edition-ISO690' ).css( 'display', s === 4 ? 'block' : 'none' );
      	};
      
      	var $menu = $( '<select>' )
      		.css( 'display', 'inline' )
      		.change( function () {
      			chooseBibSubset( this.selectedIndex );
      		} )
      		.append(
      			$( '<option>' ).text( 'Liste' ),
      			$( '<option>' ).text( 'WikiNorme' ),
      			$( '<option>' ).text( 'BibTeX' ),
      			$( '<option>' ).text( 'ISBD' ),
      			$( '<option>' ).text( 'ISO690' )
      		);
      
      	$specialBib.append( $menu );
      
      	/* default subset - try to use a cookie some day */
      	chooseBibSubset( 0 );
      };
      
      mw.hook( 'wikipage.content' ).add( addBibSubsetMenu );
      
      } // Fin du code concernant l'espace de nom 'Référence'
      
            // Add a stylesheet rule when Iframe (Editor)
            const isIframe = window.location !== window.parent.location;
            var iframeCssRules = mw.util.addCSS(
              `/*  Hide Header when Iframe / Editor. */
              .vector-column-start,
              .vector-page-titlebar {
                display: none !important;
              }`
            );
            iframeCssRules.disabled = !isIframe;
      
            /**
            * Gets diffHtml
            */
            mw.loader.using(['mediawiki.util'], function () {
              mw.hook('wikipage.diff').add(function ($diff) {
                // Has param "wikiadviser"
                const urlParams = new URLSearchParams(window.location.search);
                if (!urlParams.has('wikiadviser')) return;
      
                elementReady('.ve-init-mw-diffPage-diff').then(function (diffEl) {
                  const diffHtml = diffEl.outerHTML;
                  const articleId = mw.config.get('wgPageName');
                  if (isIframe){
                    window.parent.postMessage(
                      {
                        type: 'diff-change',
                        articleId: articleId,
                        diffHtml: diffHtml
                      },
                      '*'
                    );
                  }
                });
              });
            });
      
            /**
            * Waits for a selector to appear in document.documentElement,
            * resolving with the element once it's in the DOM.
            * Uses MutationObserver under the hood.
            *
            * @param {string} selector
            * @returns {Promise<Element>}
            */
            function elementReady(selector) {
              return new Promise(function (resolve) {
                var el = document.querySelector(selector);
                if (el) {
                  resolve(el);
                  return;
                }
                var observer = new MutationObserver(function (mutationRecords, obs) {
                  var found = document.querySelector(selector);
                  if (found) {
                    obs.disconnect();
                    resolve(found);
                  }
                });
                // Watch for additions anywhere in the document
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true
                });
              });
            }
      
            // Listen for messages from parent (wikiadviser)
            window.addEventListener('message', function(event) {
              if (event.data && event.data.type === 'wikiadviser') {
                console.log('Received Wikiadviser event:', event.data);
                if (event.data.data === 'diff') {
                  mw.wikiadviser.getDiffUrl(event.data.articleId)
                      .then(function(diffUrl) {
                          console.log('Redirecting to diff:', diffUrl);
                          window.location.replace(diffUrl);
                      })
                      .catch(function(error) {
      			            console.error('Failed to redirect to diff:', error);
                      });
                }
              }
            });
      
            // Define wikiadviser utilities on mw object
            mw.wikiadviser = {
                /**
                * Get diff URL between oldest and newest revisions
                * @param {string} articleId Page title
                * @returns {Promise<string>} Promise resolving to diff URL
                */
                getDiffUrl: function(articleId) {
                    const self = this;
                    const mediawikiBaseURL = mw.config.get("wgServer") + mw.config.get("wgScriptPath");
                    
                    return Promise.all([
                        self.getRevisionData(articleId, 'newer'),
                        self.getRevisionData(articleId, 'older')
                    ]).then(function(results) {
                        const originalRevid = results[0].revid;
                        const latestRevid = results[1].revid;
                        return `${mediawikiBaseURL}/index.php?title=${articleId}&diff=${latestRevid}&oldid=${originalRevid}&diffmode=visual&diffonly=1&wikiadviser`;
                    });
                },
      
                /**
                * Fetch revision data from API
                * @param {string} articleId Page title
                * @param {string} sort 'newer' or 'older'
                * @returns {Promise<Object>} Promise resolving to revision data
                */
                getRevisionData: function(articleId, sort) {
                    const api = new mw.Api();
                    return api.get({
                        action: 'query',
                        prop: 'revisions',
                        titles: articleId,
                        rvlimit: 1,
                        rvdir: sort,
                        formatversion: 2
                    }).then(function(data) {
                        return data.query.pages[0].revisions[0];
                    });
                }
            };
      
      })(); // Fermeture de la IIFE globale
      
      // </nowiki> /!\ Ne pas retirer cette balise

      ```
      </details>
- Import into your MediaWiki instance: http://localhost:8080/wiki/(language)/index.php/MediaWiki:Common.css and Common.js ( Need to login with the admin user, check [MW_CREDENTIALS.txt](./docker/MW_CREDENTIALS.txt) file )

### Job Queue (Not required)
- For better performance, run the job queue separately, using cron job (user `www-data`), [more informations](https://www.mediawiki.org/wiki/Manual:Job_queue#:~:text=touch%20uploaded%20files.-,Cron,-You%20could%20use)

### Citoid (Not required)
To add the advanced reference button into VisualEditor toolbar you need to add the following configuration files from wikipedia into your 
  Mediawiki instance `http://localhost:8080/wiki/(language)/index.php/MediaWiki:Cite-tool-definition.json`, More configurations below:
  - Mediawiki:Cite-tool-definition.json, Mediawiki:Citoid-template-type-map.json, Mediawiki:Visualeditor-template-tools-definition.json, Mediawiki:Visualeditor-cite-tool-name-chapter

Templates `http://localhost:8080/wiki/(language)/index.php/Template:Cite_book`, More templates below:
  - Template:Cite_book, Template:Cite_web, Template:Cite_news, Template:Cite_journal

Each template has its own documentation template, make sure to import it as well, it is recommended to export templates by category (citoid category for example) and import them all at once. [More Informations](https://www.mediawiki.org/wiki/Citoid)

</details>

<details> <summary><h4>Services Endpoints</h4></summary>

##  
  ```sh
  Wikiadviser:     http://localhost:9000
  Mediawiki:       http://localhost:8080/wiki/en/index.php/
  Supabase Studio: http://localhost:54323 (You can create your auth user from here)
  ```

</details>

## 🤝 Contributing

Thank you for taking the time to contribute! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and more information on how to get started.

If you're setting up the project for development, check out the 
[Install & Run WikiAdviser for development](CONTRIBUTING.md#install--run-wikiadviser-for-development) section.


## 🔧 Support

If you encounter any issues, please check the [issues tab](https://github.com/ankaboot-source/wikiadviser/issues) to see if it has already been reported and resolved. Ensure that you are using the latest version before reporting an issue. If the problem persists, feel free to [open a new issue](https://github.com/ankaboot-source/wikiadviser/issues/new).

Please NOTE that this app is provided for free and without any guarantee or official support. If you require additional assistance, you can contact [ankaboot professional services](mailto:contact@ankaboot.fr) for help.

## 📜 License

This software is [dual-licensed](DUAL-LICENSE.md) under [GNU AGPL v3](LICENSE).
