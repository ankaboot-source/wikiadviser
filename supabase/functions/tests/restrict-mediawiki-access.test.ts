import { assertEquals } from "jsr:@std/assert@1";
import { allowedPrefixRegEx } from "../restrict-mediawiki-access/regex.ts";

const allowedRequests = [
  "/wiki/en/extensions/wikihiero/img/hiero_T14.png?183d0",
  "/wiki/en/api.php?action=query&format=json&prop=info%7Cpageprops%7Cpageimages%7Cdescription&pithumbsize=80&pilimit=1&ppprop=disambiguation%7Chiddencat&titles=Commonly&continue=",
  "/wiki/fr/api.php?action=query&format=json&formatversion=2&revids=6871&prop=mapdata&mpdlimit=max&mpdgroups=_ea60d6453b8123b0d14767c03b1e95740ae16886",
  "/wiki/en/api.php?action=templatedata&format=json&formatversion=2&titles=Template%3ACite%20news&lang=en&includeMissingTitles=1&redirects=1",
  "/wiki/en/api.php?action=templatedata&format=json&formatversion=2&titles=Template%3ACite%20news&lang=en&includeMissingTitles=1&redirects=1",
  "/wiki/fr/api.php?action=templatedata&format=json&formatversion=2&titles=Mod%C3%A8le%3ALien%20web&lang=en&includeMissingTitles=1&redirects=1",
  "/wiki/fr/api.php?action=templatedata&format=json&formatversion=2&titles=Mod%C3%A8le%3AOuvrage&lang=en&includeMissingTitles=1&redirects=1",
  "/wiki/fr/api.php?action=editcheckreferenceurl&format=json&url=https%3A%2F%2Fpubmed.ncbi.nlm.nih.gov%2F879&formatversion=2",
  "/wiki/fr/api.php?action=query&format=json&prop=imageinfo&indexpageids=1&iiprop=size%7Cmediatype&titles=Index.php?title=Fichier:Lorraine-Corine.jpg|Index.php?title=Fichier:Lorraine geologic map.svg|Index.php?title=Fichier:Erbsenfelsen (7).jpg|Index.php?title=Fichier:Hohneck.jpg|Index.php?title=Fichier:La côte de Meuse vue depuis la Côte Saint-Germain.JPG|Index.php?title=Fichier:Grauwolf P1130280.jpg|Index.php?title=Fichier:Lynx lynx 1 (Martin Mecnarowski).jpg|Index.php?title=Fichier:Holy Roman Empire 1000 map-de.png|Index.php?title=Fichier:Lotharingia-1508.jpg|Index.php?title=Fichier:Charles III, Duke of Lorraine, by studio of François Clouet.jpg|Index.php?title=Fichier:Portrait en pied de Léopold Ier Duc de Lorraine.jpg|Index.php?title=Fichier:Stanislaw Leszczynski1.jpg|Index.php?title=Fichier:Lorraine et anciennes provinces.svg|Index.php?title=Fichier:Alsace Lorraine departments evolution map-fr.svg|Index.php?title=Fichier:2008 Smart ForTwo.jpg|Index.php?title=Fichier:TER en gare de Nancy.JPG|Index.php?title=Fichier:RailcoopMapAFD.svg|Index.php?title=Fichier:St louis arzviller.JPG|Index.php?title=Fichier:Aeroport metz nancy lorraine.JPG|Index.php?title=Fichier:Basilique saint nicolas de port.jpg|Index.php?title=Fichier:Longwy.jpg|Index.php?title=Fichier:FR-57-Manderen-Chateau de malbrouk.JPG|Index.php?title=Fichier:Chateau Luneville av 10 2010.JPG|Index.php?title=Fichier:F55 Bar-le-Duc Hotel-de-Florainville.jpg|Index.php?title=Fichier:Croix de Lorraine.png|Index.php?title=Fichier:54-Nancy-Palais Ducal-Flèche.JPG|Index.php?title=Fichier:Blason Lorraine.svg|Index.php?title=Fichier:Tarte aux mirabelles.jpg|Index.php?title=Fichier:Bière Champigneulles.JPG",
  "/wiki/en/api.php?action=query&format=json&formatversion=2&meta=siteinfo&siprop=interwikimap&maxage=86400&smaxage=86400&uselang=content",
  "/wiki/en/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url&iiurlwidth=300&iiurlheight=&titles=File%3AUSA%202007.svg",
  "/wiki/en/api.php?action=query&format=json&formatversion=2&prop=info%7Cpageprops%7Cdescription&generator=prefixsearch&gpssearch=tes&gpslimit=10&ppprop=disambiguation&redirects=true",
  "/wiki/en/index.php/Simple_Redirectable_Article",
];
allowedRequests.forEach((request, index) => {
  Deno.test(
    `Testing request restriction: Should allow request ${index}`,
    () => {
      const result = Boolean(request.match(allowedPrefixRegEx));
      assertEquals(result, true);
    }
  );
});
