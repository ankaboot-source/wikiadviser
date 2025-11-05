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

      mw.hook('ve.activationStart').add(function () {
        try {
          // Make inner page full width and hide left bar (TOC)
          var elements = document.querySelectorAll('.mw-page-container-inner, .mw-body');
          for (var i = 0; i < elements.length; i++) {
            elements[i].removeAttribute('class');
          }
        } catch (error) {
          console.error('An error occurred while trying to hide non-editor distractions', error.message);
        }
      });

      // On "Save Changes", go to diffUrl
      mw.hook('ve.activationComplete').add(function () {
        const originalSaveComplete =
          ve.init.mw.ArticleTarget.prototype.saveComplete;
        ve.init.mw.ArticleTarget.prototype.saveComplete = function (data) {
          originalSaveComplete.apply(this, arguments);

          const articleId = this.getPageName();
          window.parent.postMessage(
            {
              type: 'saved-changes',
              articleId: articleId,
            },
            '*'
          );
          mw.wikiadviser
            .getDiffUrl(articleId)
            .then(function (diffUrl) {
              console.log('Redirecting to diff:', diffUrl);
              window.location.replace(diffUrl);
            })
            .catch(function (error) {
              console.error('Failed to redirect to diff:', error);
            });
        };
      });
			
})(); // Fermeture de la IIFE globale

// </nowiki> /!\ Ne pas retirer cette balise
