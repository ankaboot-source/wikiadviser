const wikiadviserLanguagesRegex = "[a-z]{2}";
export const articleIdRegEx = new RegExp(
  `^/wiki/(${wikiadviserLanguagesRegex})/index.php(\\?title=|/)([0-9a-f-]{36})(&|$|\\?)`,
  "i",
);
// Allow to: Redirect simple article links to Wikipedia
const articleIdRedirectableRegEx = "index.php/([^\\?:]+)$";
const allowImages = "|images/";

export const allowedPrefixRegEx = new RegExp(
  `^/wiki/(${wikiadviserLanguagesRegex})/(${articleIdRedirectableRegEx})|(extensions/VisualEditor/lib/ve/src/ui|images/thumb|load.php\\?|api.php\\?action=(editcheckreferenceurl|query|templatedata)&format=json&(formatversion=2&)?(url|meta=(filerepoinfo|siteinfo)|(revids=\\d+&prop=mapdata|titles=)|prop=(imageinfo(&indexpageids=1&iiprop=size%7Cmediatype|&iiprop=url&iiurlwidth=300&iiurlheight=)?|info%7Cpageprops%7C(pageimages%7Cdescription&pithumbsize=80&pilimit=1&ppprop=disambiguation%7Chiddencat|description&generator=prefixsearch&gpssearch=))(&titles=)?)|(skins|resources|images/timeline)/|extensions/(UniversalLanguageSelector|Kartographer|wikihiero))${allowImages}`,
  "i",
);
