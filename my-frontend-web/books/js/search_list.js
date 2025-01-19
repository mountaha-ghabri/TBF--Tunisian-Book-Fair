window.sInstance = CFInstance;
window.sBaseId = '';
window.sThesaurusId = 'IFD_CLASSIFTHEME';
window.sSuperLexiconId = '';
window.sControlId = 'ClassificationThematique';
window.sRootNodeId = '';
window.bContextualize = true;
window.sCookieSubKey = 'ClassificationThematique';
window.sexternalLinksCountPropertyName = '';
window.sIdesiaBaseId = "";
window.sTopNode = '';
window.sBKLSortKeyId = '';
window.sBKLIndexId = '';
window.sBackurl = '';
window.sScenario = '';
window.idesiaNavigator;
window.disableGoogleSyncAnalytics = true;

/////////////////////////////////////////////////////////
// Namespace (w. Module Pattern)
window.ErmesManager = (function (pub) {

  // Nom de la propriété de cookie stockant les recherches
  const ContextSearchCookiePropertyName = 'search';

  // Nom de la propriété de cookie stockant le flag de restauration de contexte
  const ContextRestoreCookiePropertyName = 'contextRestore';

  //Public variables
  pub.ExternalChange = false;
  pub.CurrentSearchType = pub.SearchType.List;
  pub.AjaxAutocomplete = true;

  pub.setContextRestore = function () {
    ErmesManager.saveCookieValue(ErmesManager.COOKIES_SEARCH, ContextRestoreCookiePropertyName, true);
  };

  // Tentative de restauration du contexte de recherche (notamment utile dans le cas d'authentification CAS où les navigations s'enchaînent sans préserver les hashs d'url)
  pub.tryRestoreSearchContext = function () {
    // On vérifie qu'on a demandé à restaurer le contexte
    if (!ErmesManager.getCookieValue(ErmesManager.COOKIES_SEARCH, ContextRestoreCookiePropertyName, false))
      return;

    // On RAZ pour ne pas restaurer le contexte à nouveau ultérieurement
    ErmesManager.saveCookieValue(ErmesManager.COOKIES_SEARCH, ContextRestoreCookiePropertyName, null);

    // Récupération du cookie de recherche courant
    var fromCookieSearchQuery = ErmesManager.getCookieValue(ErmesManager.COOKIES_SEARCH, ContextSearchCookiePropertyName, null);

    // On efface de suite le cookie stocké pour ne plus le réutiliser
    ErmesManager.saveCookieValue(ContextSearchCookiePropertyName, ContextSearchCookiePropertyName, null);

    // Pas de cookie de recherche, on sort
    if (!fromCookieSearchQuery)
      return false;

    // Hash de recherche déjà présent, on sort
    if (hasher.getHash())
      return false;

    // On restaure le contexte de recherche
    var encodedQuery = rison.encode(fromCookieSearchQuery);

    switch (fromCookieSearchQuery.sst) {
      case ErmesManager.SearchType.List:
        hasher.replaceHash('Search/' + encodedQuery);
        return true;
      case ErmesManager.SearchType.Detail:
        hasher.replaceHash('Detail/' + encodedQuery);
        return true;
      default: break;
    }

    return false;
  };

  //Return public members
  return pub;
}(window.ErmesManager || {}));

window.ErmesGUI = (function (pub) {

  //Override du restoreScenario du GUI pour ajouter le scénario en cookie si il n'est pas présent dans la liste.
  pub.restoreScenario = function () {
    var jsonCookie = {};
    var $selectedOption;

    jsonCookie = JSON.parse($.cookie(ErmesManager.COOKIES_SEARCH));
    if (typeof jsonCookie == "undefined" || jsonCookie == null || typeof jsonCookie.mainScenario == "undefined") {
      //Sélection du scenario par défaut
      $selectedOption = $("option[value='DEFAULT']", $("#globalScenario"));
      $selectedOption.prop("selected", true);

      $("#globalScenarioMobile").find("[data-scenario='DEFAULT']").addClass('active');

      $("#scenario-selected-label").text($("#globalScenarioMobile").find("[data-scenario='DEFAULT']").text());

      $("#globalScenario").trigger("change");

      ErmesManager.checkScenarioOptions($selectedOption);

      return;
    } else {
      $selectedOption = $("option[value='" + jsonCookie.mainScenario + "']", $("#globalScenario"));
      if ($selectedOption.length) {
        $selectedOption.prop("selected", true);

        //Sélection du scenario stocké dans le cookie
        $("#globalScenarioMobile").find("[data-scenario='" + jsonCookie.mainScenario + "']").addClass('active');
      } else {
        $('#globalScenario')
          .append($("<option></option>")
            .val(jsonCookie.mainScenario)
            .prop("selected", true)
            .text(jsonCookie.mainScenarioText));
      }

      // Afficher le label du scénario sélectionné
      $("#scenario-selected-label").text($("#globalScenarioMobile").find("[data-scenario='" + jsonCookie.mainScenario + "']").text());

      ErmesManager.checkScenarioOptions($selectedOption);
    }
  };

  return pub;

})(window.ErmesGUI || {});

/////////////////////////////////////////////////////////
// Classe 'Form'
ErmesManager.Form = function () {
  this.CurrentTimeout = {};
  this.EnrichmentLoaded = false;
  this.AjaxSearch;
  this.AjaxFacetContains;
  this.CurrentHierarchicalFacet = [];
  var ajaxAvailability;

  //Binding event searchComplete
  $(this).bind("searchCompleted", ErmesManager.event.onSearchComplete);

  this.clearTimeOut = function () {
    ErmesManager.flushAjaxCalls();

    if (ErmesManager.isDefined(this.CurrentTimeout)) {
      clearTimeout(this.CurrentTimeout);
    }
  };

  this.doSearch = function ($container, options) {
    // On débute la nouvelle recherche par l'annulation des éventuelles requêtes encore en cours d'exécution (utile notamment pour les recherches lentes type PZ2 ou serveurs Solr lents)
    ErmesManager.flushAjaxCalls();

    if (!(options && options.hideAjaxLoader)) {
      if (this.ajaxLoaderTimeout) { // Clear des loader résiduels
        window.clearTimeout(this.ajaxLoaderTimeout);
      }
      this.ajaxLoaderTimeout = window.setTimeout(function () { $(".panel-loading").show(); }, ErmesManager.MaxLoadingTime); // On retarde l'apparition de l'Ajax Loader
    }

    ErmesManager.beforeSearch();

    if (typeof this.AjaxSearch != "undefined") {
      this.AjaxSearch.abort();
    }
    if (typeof ajaxAvailability != "undefined") {
      ajaxAvailability.abort();
    }

    if (this.DetailMode) {
      ErmesManager.CurrentSearchType = ErmesManager.SearchType.SearchDetail;
    }

    //Réglage du paramètre PageRange qui permet de choisir le nombre de pages à afficher dans la pagination
    this.Query.query.PageRange = 3;

    delete this.Query.query.FacetContains; //FacetContains sert au mécanisme de filtrage de facette (appel ajax à RefreshFacet), il doit être remis à zéro lors du déclenchement de la recherche
    delete this.Query.query.Url;

    if (this.Query.query.SearchQuery) {
      delete this.Query.query.SearchQuery.Url;
    }

    var self = this,
      serviceBaseUrl = "";
    var encodedQuery = rison.encode(self.Query);

    this.EnrichmentLoaded = false;
    ErmesManager.ExternalChange = true; //Hack pour éviter de déclencher l’évent hashChange 2 fois si la query contient un quote (bug)

    // Mémorisation du type de recherche (détail/liste)
    (this.Query || {}).sst = ErmesManager.CurrentSearchType;

    ErmesManager.saveCookieValue(ErmesManager.COOKIES_SEARCH, "search", this.Query);

    switch (ErmesManager.CurrentSearchType) {
      case ErmesManager.SearchType.List:
        serviceBaseUrl = ErmesManager.BasePath + "Portal/Recherche/Search.svc/Search" + ErmesManager.WsQueryString;
        break;
      case ErmesManager.SearchType.Detail:
        serviceBaseUrl = ErmesManager.BasePath + "Portal/Recherche/Search.svc/GetRecord" + ErmesManager.WsQueryString;
        break;
      default: break;
    }

    this.Query.query.Url = window.location.href;

    var callback = function (json) {
      ErmesManager.ExternalChange = false; //Hack pour éviter de déclencher l’évent hashChange 2 fois si la query contient un quote (bug)

      if (!ErmesManager.checkResponse(json)) {
        $.extend(self.Query.query, self.PreviousQuery.query); //Rollback de la requête
        return true;
      }

      self.Query.query = json.d.Query;
      self.Result = json.d.Results || json.d.Result;
      self.Info = json.d.SearchInfo || json.d.Infos;

      if (self.Info.DetailMode) {
        self.Query = {
          query: { Id: 0, Index: 1, NBResults: 1, SearchQuery: json.d.Query }
        };
        ErmesManager.CurrentSearchType = ErmesManager.SearchType.Detail;

        return self.doSearch($container, options);
      }

      switch (ErmesManager.CurrentSearchType) {
        case ErmesManager.SearchType.List:
          hasher.getHash() ? ErmesManager.setHashSilently("Search/" + encodedQuery) : ErmesManager.replaceHashSilently("Search/" + encodedQuery);
          break;
        case ErmesManager.SearchType.Detail:
          hasher.getHash() ? ErmesManager.setHashSilently("Detail/" + encodedQuery) : ErmesManager.replaceHashSilently("Detail/" + encodedQuery);
          break;
        default: break;
      }

      $(window).unbind("resize");

      $container.html(json.d.HtmlResult).show();

      if (self.ajaxLoaderTimeout) {
        window.clearTimeout(self.ajaxLoaderTimeout);
      }
      $(".panel-loading").hide();

      $(self).trigger("searchCompleted", $container);
      if (options && options.successCallback) {
        options.successCallback.apply(self, options.successCallbackArgs);
      }

      if (self.Info.MenuCollapsible) {
        if (window.isMenuCollapsed === undefined) {
          ErmesManager.callback.common.toggleCollapseFacetMenu(self.Info.MenuCollapsedByDefault, true);
        }
        else {
          ErmesManager.callback.common.toggleCollapseFacetMenu(window.isMenuCollapsed, true);
        }
      }

      ErmesManager.callback.common.updateCustomSticky();

      return false;
    };

    // Pas de fadeout en recherche asynchrone
    if (ErmesManager.isNullOrEmpty(this.Info.PazPar2Info) || this.Info.PazPar2Info.ActiveClients === 0) {
      $container.fadeTo(0, 0.7);
    }

    // 20200110 : On RAZ le GUID de session PazPar2 en cas de changement de scénario (sinon, on conserve les mêmes sources de recherche...)
    if (ErmesManager.LastScenarioCode && ErmesManager.LastScenarioCode !== this.Query.query.ScenarioCode) {
      delete this.Query.query.SessionGuid;
    }

    // Mémorisation du scénario utilisé
    ErmesManager.LastScenarioCode = this.Query.query.ScenarioCode;

    this.AjaxSearch = $.ajax(
      {
        url: serviceBaseUrl,
        data: JSON.stringify(this.Query),
        success: callback
      });
  };
};

//Hérite de 'BaseForm' (common.js)
ErmesManager.Form.prototype = ErmesManager.BaseForm;
ErmesManager.Form.prototype.parent = ErmesManager.BaseForm;
ErmesManager.Form.prototype.constructor = ErmesManager.Form;

/////////////////////////////////////////////////////////
// Sous-module 'event'
ErmesManager.event = (function (pub) {

  var old_onSearchComplete = pub.onSearchComplete; //Héritage

  pub.onSearchComplete = function (event, $container) {
    var self = this;

    // Fermeture des éventuelles fenêtres modales bootstrap orphelines
    if ((!$("#partner-site-of-intervention-dialog").length || $("#partner-site-of-intervention-dialog").is(":hidden"))
      &&
      (!$(".search-assistant-modal").length || $(".search-assistant-modal").is(":hidden"))
    ) {
      $("div.modal").modal("hide");
      $("div.modal-backdrop").remove();
    }
    $("#textfield").typeahead('close');

    // Permet de remplacer les images en 404 par l'image par défaut
    $('img.ermes-thumb').bind('error', function () {
      $(this).attr('src', '/ui/skins/default/portal/front/images/general/vide.gif');
    });

    if (ErmesManager.CurrentSearchType !== ErmesManager.SearchType.Detail) {
      //affichage du "Détail du document" dans la file d'ariane
      ErmesManager.hideBreadcrumbDetail();
      var $items = $("div.notice_courte", "#resultats");

      $.each(this.Result, function (index, value) {
        $($items[index]).data("result", value);
      });

      // Gestion spécifique PazPar2
      if (ErmesManager.isDefined(this.Info.PazPar2Info)) {
        if (ErmesManager.isDefined(this.CurrentTimeout)) {
          clearTimeout(this.CurrentTimeout);
        }
        if (this.Info.PazPar2Info.ActiveClients > 0) {
          //$("#SearchContext").addClass("chargement_async");
          $("#global_contenu > div.PORTAL_LAYOUT").addClass("chargement_async");
          this.CurrentTimeout = setTimeout(function () { self.doSearch($($container), { hideAjaxLoader: true }); }, 1000);
        }
        else { //Plus de client actif
          //$("#SearchContext").removeClass("chargement_async");
          $("#global_contenu > div.PORTAL_LAYOUT").removeClass("chargement_async");

          // call holdings
          this.getHoldings($container);
        }
      }
      else { //Cas d'une recherche Solr
        $("#global_contenu > div.PORTAL_LAYOUT").removeClass("chargement_async");
        // call holdings
        this.getHoldings($container);
      }

      // Navigation thématique
      var navigationTargetDiv = $("div#lexiconsTargetDiv");
      if (navigationTargetDiv.length != 0) {
        sScenario = this.Query.query.ScenarioCode;
        idesiaNavigator = new IdesiaNavigator();
        idesiaNavigator.init();
      }

      // Abonnement des facettes calendrier 
      if (window.searchFacetCalendar) {
        for (var i = 0; i < window.searchFacetCalendar.length; i++) {
          var searchFacetCalendar = window.searchFacetCalendar[i];
          searchFacetCalendar.then(function (_calendar) {
            _calendar.$on('select-date', function (date) {
              ErmesManager.callback.list.addFacetFilter(event, _calendar, date);
            });
          });
        }
      }

      var hierarchicalLen = self.CurrentHierarchicalFacet.length,
        currentHierarchicalFacet;

      while (hierarchicalLen--) {
        currentHierarchicalFacet = self.CurrentHierarchicalFacet.shift();
        $('#facet_container .hierarchical-facet[data-id=\'' + currentHierarchicalFacet.id + '\']').parent().html(currentHierarchicalFacet.html);
      }

      ErmesManager.initHierarchicalFacet(self.Query.query);
    }
    else { //Detail
      //affichage du "Détail du document" dans la file d'ariane
      ErmesManager.showBreadcrumbDetail();

      $("#notice_longue").data("result", self.Result);
      ErmesManager.checkEmptyTabs();

      var dataJson = null;
      if (ErmesManager.isDefined(self.Result.Resource)) {
        dataJson = { Record: { RscId: self.Result.Resource.RscId, Docbase: self.Result.Resource.RscBase, PazPar2Id: self.Query.query.Id }, searchQuery: self.Query.query.SearchQuery };
      }

      if (!ErmesManager.isDefined(self.Info)) {
        self.Info = { SeekForHoldings: true };
      }

      if (ErmesManager.isDefined(dataJson) && self.Info.SeekForHoldings) {
        var linkedNotices = this.Result.LinkedResultsTwin.Notices;
        var worknotices = this.Result.WorksKeyResults;

        if (self.Result.SeekForHoldings) {
          $.when(this.getHoldingsFull($container, dataJson)).then(function (resp) {
            ErmesManager.BaseForm.getHoldingTwinNotice($container, linkedNotices, worknotices, self.Query.query.SearchQuery, self.Query.query.Id);
          });
        } else {
          $("#detail-holdings-abstract").html("");
          $("#detail-holdings").html("");
          ErmesManager.BaseForm.getHoldingTwinNotice($container, linkedNotices, worknotices, self.Query.query.SearchQuery, self.Query.query.Id);
        }
      }
      else {
        //Injection des notices liées dans les exemplaires.
        //Container, notice liée, Searchquery, PazPar2, notices issus de la même oeuvre (uniquement en détail)
        ErmesManager.BaseForm.getHoldingTwinNotice($container, this.Result.LinkedResultsTwin.Notices, this.Result.WorksKeyResults, self.Query.query.SearchQuery, self.Query.query.Id);
      }

      ErmesManager.initRoyalSlider('.royalSlider');

      ErmesManager.initUserNoteNotice();
    }

    // Restaure la transparence à 0
    $($container).fadeTo(0, 1);

    if (!ErmesManager.isDefined(this.Info.PazPar2Info) || this.Info.PazPar2Info.ActiveClients === 0) { // Dans le cas de PazPar2 on évite de faire un scroll à chaque polling, uniquement lorsque la recherche est finie (ou si on pagine)
      if (self.Settings.PreventScroll) {
        self.Settings.PreventScroll = false;
      } else {
        ErmesManager.callback.detail.scrollToItem();
      }
    }

    if (ErmesManager.labels.ErmesSearchPageTitle || ErmesManager.labels.ErmesSearchDetailPageTitle) {
      switch (ErmesManager.CurrentSearchType) {
        case ErmesManager.SearchType.List:
          var searchTerm;
          if (this.Query.query.SearchLabel || this.Query.query.QueryString) {
            searchTerm = this.Query.query.SearchLabel || this.Query.query.QueryString;
            if (this.Info.FacetListInfo && this.Info.FacetListInfo.length) {
              searchTerm += SearchFiltersText + " : ";
              var facetJson = this.Info.FacetListInfo;
              $.each(facetJson, function (key, facetObject) {
                searchTerm += " - " + facetObject.Label;
              });
            }

            document.title = ErmesManager.labels.ErmesSearchPageTitle.replace("{0}", searchTerm);
          } else {
            document.title = searchTerm = ErmesManager.labels.ErmesFormTitle;
          }
          // Écriture événement Google Analytics
          // On ne logue la recherche que si elle varie (pour éviter de loguer les paginations qui ne sont pas de nouvelles recherches)
          if (ErmesManager.googleAnalytics.lastSearchTerm !== searchTerm) {
            ErmesManager.googleAnalytics.trackEvent(ErmesManager.googleAnalytics.Categories.Recherche.label, ErmesManager.googleAnalytics.Categories.Recherche.actions.Recherche.label, searchTerm);
            ErmesManager.googleAnalytics.lastSearchTerm = searchTerm;
          }

          break;
        case ErmesManager.SearchType.Detail:
          if (ErmesManager.isDefined(this.Result.Resource)) {
            var itemTitle = this.Result.Resource.Ttl;
            document.title = ErmesManager.labels.ErmesSearchDetailPageTitle.replace("{0}", itemTitle);

            // Écriture événement Google Analytics
            ErmesManager.googleAnalytics.trackEvent(ErmesManager.googleAnalytics.Categories.Recherche.label, ErmesManager.googleAnalytics.Categories.Recherche.actions.DetailNotice.label, itemTitle);
          }
          break;
        default: break;
      }
    }

    // Écriture de logs Google Analytics
    ErmesManager.googleAnalytics._trackPageview(ErmesManager.BasePath + '#' + hasher.getHash());

    // Rating star
    //$('input.rating[type=number]').rating();

    old_onSearchComplete(event, $container);

    //On retire le focus du champs de recherche une fois effectué (FS#2080)
    //sauf si on est sur une recherche Pazpar2 ;) (WI#15850)
    if (!ErmesManager.isDefined(this.Info.PazPar2Info) && !ErmesManager.CurrentScenarioIsAssisted) {
      $('input#textfield').blur();
    }

    //initialisation des title des combos de recherche - Accessibilité
    $(document.body).on('shown.bs.dropdown hidden.bs.dropdown', '.searchList-btn', ErmesGUI.callback.bootstrapDropDownSwitchTitleStates).trigger("hidden.bs.dropdown");

    //Charge les modales qui seraient définies en format d'affichage
    $('[data-embed]').each(function (index, frame) {
      portalManager.computeEmbed.apply(portalManager, [frame, false]);
    });

    // Appel Javascript pour le mode d'affichage 'display-mosaic'
    if (document.querySelector('#containerSearchList') != null) {
      ErmesManager.callback.displayMosaic.waitSearchListLoadImage();
    }
  };

  return pub;
}(ErmesManager.event));

/////////////////////////////////////////////////////////
// Sous-module 'callback'

ErmesManager.callback.list = (function (pub) {

  pub.displayMoreFacet = function () {
    var $this = $(this);
    var $container = $this.closest(".facet-collapse");
    var $facetContainer = $container.find("ul");

    $facetContainer.find("li.facet-item-hidden").removeClass("facet-item-hidden").addClass("facet-item");
    $container.find("button.facet-see-more").hide();
    $container.find("button.facet-see-less").show();

    $container.closest(".panel-group").find("a.accordion-toggle:first")[0].focus();

    return false;
  };

  pub.displayLessFacet = function () {
    var $this = $(this);
    var $container = $this.closest(".facet-collapse");
    var $facetContainer = $container.find("ul");

    $facetContainer.find("li.facet-item").removeClass("facet-item").addClass("facet-item-hidden");
    $container.find("button.facet-see-less").hide();
    $container.find("button.facet-see-more").show();

    $container.closest(".panel-group").find("a.accordion-toggle:first")[0].focus();

    return false;
  };

  // Fermeture d'une catégorie de facettes
  pub.hiddenFacetCategory = function () {
    var $this = $(this),
      $accordionToggle = $this.parents(".panel-group").children(".accordion-toggle"),
      facetValue = $.trim($accordionToggle.text());

    $accordionToggle.attr("title", facetValue + ErmesManager.labels.FacetCollectionCollapsed);
    $accordionToggle.children(".panel").children(".panel-heading").children(".panel-title").children("i").attr("class", "icon-resize-full pull-right");

    return false;
  };

  // Ouverture d'une catégorie de facettes
  pub.shownFacetCategory = function () {
    var $this = $(this),
      $accordionToggle = $this.parents(".panel-group").children(".accordion-toggle"),
      facetValue = $.trim($accordionToggle.text());

    $accordionToggle.attr("title", facetValue + ErmesManager.labels.FacetCollectionDisplayed);
    $accordionToggle.children(".panel").children(".panel-heading").children(".panel-title").children("i").attr("class", "icon-resize-small pull-right");

    return false;
  };

  pub.showFacetError = function () {
    var $this = $(this);
    $this.toggleClass('show-error');
  };

  //Ajout d'un filtre par facette
  pub.toggleSearchRestrictor = function (event) {
    var $this = $(this);
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");
    var query = data.Query.query;

    var id = $this.data("id");
    var checked = $this.is(':checked');

    var arr = query.SelectedSearchGridFieldsShownOnResultsIds || [];

    // Clonage des valeurs présentes dans un object
    var obj = {};
    arr.forEach(function (presentId) {
      obj[presentId] = true;
    });

    // On ajoute ou supprime l'identifianr coché/décoché
    if (checked) {
      obj[id] = true;
    } else {
      delete obj[id];
    }

    var newArr = [];
    Object.keys(obj).forEach(function (key) {
      newArr.push(key);
    })
    query.SelectedSearchGridFieldsShownOnResultsIds = newArr;

    query.ForceSearch = true;
    query.Page = 0;

    // Flush des appels ajax
    ErmesManager.flushAjaxCalls();

    $(data).one("searchCompleted", function () {
      $("#ancreSearch")[0].focus();
    });

    data.doSearch($container);

    return false;
  }

  //Ajout d'un filtre par facette
  pub.addFacetFilter = function (event, calendar, date) {
    var $this = $(this);
    if ($this.hasClass("disabled") || $this.hasClass("failed"))
      return false;

    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");
    var parsedFacetFilter = {};
    var facetId;
    var facetLabel;
    if (calendar && date) {
      facetId = calendar.facetId;
      facetLabel = [date.start.getFullYear(), date.start.getMonth() + 1, date.start.getDate()].join('/') + ' 00:00|' + [date.end.getFullYear(), date.end.getMonth() + 1, date.end.getDate()].join('/') + ' 23:59';
    }
    else {
      facetId = $this.closest("ul.facetList").attr("id");
      facetLabel = $this.find("a > span[data-ermes-facet-value]").attr("data-ermes-facet-value");

      if ($this.find('.facet-multiselect-checkbox').length) { //cas d'une facette avec multi sélection
        return pub.refreshMultipleFacetFilter.apply(this, [event]);
      }
    }

    if (ErmesManager.isDefined(data.Query.query.FacetFilter)) {
      parsedFacetFilter = JSON.parse(data.Query.query.FacetFilter);
    }

    parsedFacetFilter["_" + facetId] = facetLabel; //Chrome workaround : éviter le tri automatique de l'objet json en rendant impossible la conversion de facetId en entier (ajout d'un '_')

    data.Query.query.ForceSearch = true;
    $.extend(data.PreviousQuery.query, data.Query.query); //Deep-clone
    data.Query.query.FacetFilter = JSON.stringify(parsedFacetFilter);
    data.Query.query.Page = 0;

    // Flush des appels ajax
    ErmesManager.flushAjaxCalls();

    $(data).one("searchCompleted", function () {
      $("#ancreSearch")[0].focus();
    });

    data.doSearch($container);

    return false;
  };

  //Recalcule d'un facetFilter multiple
  pub.refreshMultipleFacetFilter = function (event) {
    var $container = ErmesManager.findClosestContainer(this);
    var $this = $(this);
    var data = $container.data("form");
    var facetId = $this.closest("ul.facetList").attr("id");
    var facetLabel, i, len, checkedFacets = [];
    if (event) {
      var clickedElement = $(event.target);
      if (clickedElement.is(":checkbox") === false) {
        var facetCheckbox = $this.find('.facet-multiselect-checkbox');
        facetCheckbox.prop("checked", !facetCheckbox.prop("checked"));
      }
    }

    var checkedFacetNodes = $this.closest('ul.facetList').find('li:has(.facet-multiselect-checkbox:checked)');

    for (i = 0, len = checkedFacetNodes.length; i < len; i++) {
      checkedFacets.push($(checkedFacetNodes[i]).find("a > span[data-ermes-facet-value]").attr("data-ermes-facet-value"));
    }

    facetLabel = checkedFacets.join('||');

    var parsedFacetFilter = {};

    if (ErmesManager.isDefined(data.Query.query.FacetFilter)) {
      parsedFacetFilter = JSON.parse(data.Query.query.FacetFilter);
    }

    if (facetLabel) {
      parsedFacetFilter["_" + facetId] = facetLabel; //Chrome workaround : éviter le tri automatique de l'objet json en rendant impossible la conversion de facetId en entier (ajout d'un '_')
    } else {
      delete parsedFacetFilter["_" + facetId];
    }

    data.Query.query.ForceSearch = true;
    $.extend(data.PreviousQuery.query, data.Query.query); //Deep-clone
    data.Query.query.FacetFilter = JSON.stringify(parsedFacetFilter);
    data.Query.query.Page = 0;

    // Flush des appels ajax
    ErmesManager.flushAjaxCalls();

    $(data).one("searchCompleted", function () {
      $("#ancreSearch")[0].focus();
    });

    data.doSearch($container);

    return false;
  };

  //Ajout d'un filtre par facette
  pub.addHierarchicalFacetFilter = function () {
    if (!$(this).hasClass("disabled")) {
      var $container = ErmesManager.findClosestContainer(this);
      var $this = $(this);
      var data = $container.data("form");
      var facetId = $this.closest(".hierarchical-facet").data("id");
      var parsedFacetFilter = {};

      if (ErmesManager.isDefined(data.Query.query.FacetFilter)) {
        parsedFacetFilter = JSON.parse(data.Query.query.FacetFilter);
      }

      var selectedNodes = $this.closest(".hierarchical-facet").jstree().get_selected();
      var i, len, facetFilters = [];

      for (i = 0, len = selectedNodes.length; i < len; i++) {
        facetFilters.push($('#' + selectedNodes[i]).find('[data-ermes-facet-value]').data('ermes-facet-value'));
      }

      var facetLabel = facetFilters.join('||');

      if (facetLabel) {
        parsedFacetFilter["_" + facetId] = facetLabel; //Chrome workaround : éviter le tri automatique de l'objet json en rendant impossible la conversion de facetId en entier (ajout d'un '_')
      } else {
        delete parsedFacetFilter["_" + facetId];
      }

      data.Query.query.ForceSearch = true;
      $.extend(data.PreviousQuery.query, data.Query.query); //Deep-clone
      data.Query.query.FacetFilter = JSON.stringify(parsedFacetFilter);
      data.Query.query.Page = 0;

      // Flush des appels ajax
      ErmesManager.flushAjaxCalls();

      $(data).one("searchCompleted", function () {
        $("#ancreSearch")[0].focus();
      });

      data.CurrentHierarchicalFacet.push({ id: facetId, html: $this.closest(".hierarchical-facet").parent().html() });
      data.doSearch($container);
    }
    return false;
  };

  pub.removeGeoBounds = function (event) {
    var $container = ErmesManager.findClosestContainer(this);
    var $this = $(this);
    var data = $container.data("form");

    if (_.get(data, 'Query.query.GeoBounds')) {
      delete data.Query.query.GeoBounds
      data.Query.query.Page = 0;

      // Flush des appels ajax
      ErmesManager.flushAjaxCalls();

      data.doSearch($container);
    }

    return false;
  }

  //Suppression d'un filtre par facette
  pub.removeFacetFilter = function (event) {
    var $container = ErmesManager.findClosestContainer(this);
    var $this = $(this);
    var data = $container.data("form");
    var facetId = $this.closest("li").attr("id").substr(5);

    if ($this.find('.facet-multiselect-checkbox').length) { //cas d'une facette avec multi sélection
      return pub.refreshMultipleFacetFilter.apply(this, [event]);
    }

    //Cas facette fictive (Rebond depuis facette d'encart de recherche capturée non présente dans le scénario)
    if (facetId === "_0") {
      data.Query.query.RawQueryParameters = null;
    }
    var parsedFacetFilter = JSON.parse(data.Query.query.FacetFilter);
    parsedFacetFilter = ErmesManager.isDefined(parsedFacetFilter) ? parsedFacetFilter : {};
    delete parsedFacetFilter[facetId];

    data.Query.query.ForceSearch = true;
    $.extend(true, data.PreviousQuery.query, data.Query.query); //Deep-clone
    data.Query.query.FacetFilter = JSON.stringify(parsedFacetFilter);
    data.Query.query.Page = 0;

    // Flush des appels ajax
    ErmesManager.flushAjaxCalls();

    data.doSearch($container);
    return false;
  };

  pub.removeGridFilter = function () {
    var $container = ErmesManager.findClosestContainer(this);
    var $this = $(this);
    var data = $container.data("form");
    var filterId = $this.closest("li").attr("id").substr(6);

    var parsedGrid = data.Query.query.Grid && JSON.parse(data.Query.query.Grid);

    if (parsedGrid && parsedGrid[filterId]) {
      delete parsedGrid[filterId];
      $('.ermes_form').populate(parsedGrid);
      data.Query.query.Grid = JSON.stringify(parsedGrid);
    } else if (data.Query.query.DisabledMemorizedFilters) {
      data.Query.query.DisabledMemorizedFilters.push(filterId);
    } else {
      data.Query.query.DisabledMemorizedFilters = [filterId];
    }

    data.Query.query.ForceSearch = true;
    $.extend(true, data.PreviousQuery.query, data.Query.query); //Deep-clone

    data.Query.query.Page = 0;
    //Required to remove the minify search Label in case of same advanced grid filter was removed 
    if (data.Query.query.SearchLabel) {
      delete data.Query.query.SearchLabel;
    }

    // Flush des appels ajax
    ErmesManager.flushAjaxCalls();

    data.doSearch($container);
    return false;
  };

  //Suppression query string
  pub.removeQueryString = function () {
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");

    data.Query.query.QueryString = "*:*";
    data.doSearch($container);
    return false;
  };

  //Changement de tri
  pub.setSortField = function () {
    var $this = $(this);

    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");

    var newSortField = $this.attr('data-value') ? $this.attr('data-value') : "";

    // Init
    if (typeof data.Query.query.SortField == "undefined") {
      data.Query.query.SortField = "";
    }

    data.Query.query.SortField = newSortField;
    if (typeof $this.attr('data-sort') == 'undefined') {
      data.Query.query.SortOrder = newSortField === "" || newSortField === "YearOfPublication_sort" || newSortField === "Popularity_sort" || newSortField === "DateOfInsertion_sort" ? 0 : 1;    // On trie par défaut en décroissant sur la pertinence, la date, et la popularité à l'inverse des autres champs
    }
    else {
      data.Query.query.SortOrder = $this.attr('data-sort') === 'Desc' ? 0 : 1;
    }

    data.doSearch($container);

    return false;
  };

  pub.showTemplateEdit = function () {
    var $this = $(this);
    $this.closest("div.notice_courte").find("div.templateContainer").show();

    return false;
  };

  pub.spellChecking = function () {
    var $this = $(this);
    var query = $this.find("span").text();
    ErmesManager.CurrentSearchType = ErmesManager.SearchType.List;
    var textfield = $("#textfield");
    textfield.val(query);
    ErmesManager.callback.common.search(textfield, { QueryString: query, ResultSize: ErmesManager.getCookieValue(ErmesManager.COOKIES_FORM, "resultSize", -1), Grid: null, ScenarioCode: $("#globalScenario").val(), ForceSearch: true, CloudTerms: [], SearchLabel: "", SearchContext: ErmesManager.SearchContexts.SpellCheking });
    return false;
  };

  pub.showGroupedResults = function () {
    var $this = $(this);
    $this.closest("li").find("div.grouped_results_container").show();
    $this.removeClass("show_grouped_results").addClass("hide_grouped_results");
    return false;
  };

  pub.hideGroupedResults = function () {
    var $this = $(this);
    $this.closest("li").find("div.grouped_results_container").hide();
    $this.removeClass("hide_grouped_results").addClass("show_grouped_results");
    return false;
  };

  pub.seeAllGroupedResults = function () {
    var $this = $(this);
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");

    data.Query.query.GroupSize = 100;
    data.doSearch($container);

    var index = $this.closest("li").index();

    $container.one('searchHtmlLoaded', function () {
      $("button.link_grouped_results", "#resultats > ul > li:eq(" + index + ")").trigger("click");
    });

    return false;
  };

  pub.reboundGroupedResults = function () {
    var $this = $(this);
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");
    var groupId = $this.data("groupid");
    var groupField = $this.data("groupfield");

    var parsedRawParameters = {};

    if (ErmesManager.isDefined(data.Query.query.RawQueryParameters)) {
      parsedRawParameters = JSON.parse(data.Query.query.RawQueryParameters);
    }

    // On place le terme de grouping entre quotes (pour éviter les recherches muettes en cas de caractère spéciaux)
    var groupIdEscaped = (groupId || '').replace('"', '\\"');
    var groupingFilterQuery = groupField + ':"' + groupIdEscaped + '"';

    if (parsedRawParameters["fq"] instanceof Array) {
      parsedRawParameters["fq"].push(groupingFilterQuery);
    } else {
      parsedRawParameters["fq"] = [groupingFilterQuery];
    }

    data.Query.query.RawQueryParameters = JSON.stringify(parsedRawParameters);
    data.Query.query.UseGrouping = false;
    data.Query.query.Page = 0;

    // Flush des appels ajax
    ErmesManager.flushAjaxCalls();

    data.doSearch($container);
    window.scrollTo(0, 0);

    return false;
  };

  pub.removeGroupedResultsRebound = function () {
    var $this = $(this);
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");
    var groupField = $this.data("groupfield");

    if (ErmesManager.isDefined(data.Query.query.RawQueryParameters)) {
      parsedRawParameters = JSON.parse(data.Query.query.RawQueryParameters);

      if (parsedRawParameters["fq"] instanceof Array) {
        var arr = $.grep(parsedRawParameters["fq"], function (a) { return a.indexOf(groupField) >= 0; });

        for (var i = 0, len = arr.length; i < len; ++i) {
          parsedRawParameters["fq"] = parsedRawParameters["fq"].slice(parsedRawParameters["fq"].indexOf(arr[i]) + 1);
        }
      }

      data.Query.query.RawQueryParameters = JSON.stringify(parsedRawParameters);
      delete data.Query.query.UseGrouping;
      data.Query.query.Page = 0;

      // Flush des appels ajax
      ErmesManager.flushAjaxCalls();

      data.doSearch($container);
    }

    window.scrollTo(0, 0);
    return false;
  };

  pub.changeSiteRestriction = function () {
    var $this = $(this);
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");

    $this.closest('div').removeClass('open');
    $this.closest('div').find('button span.labelSelect').text($this.text()); //mode desktop change le label
    $this.parents('ul').find('li a').attr('class', ''); //Remet à zero
    data.Query.query.SiteCodeRestriction = $this.attr('data-value') ? $this.attr('data-value') : "";
    $this.attr('class', 'active'); //marque le site sélectionné

    $this.parents('.searchList-btn').trigger("hidden.bs.dropdown");

    $(".statut", "#resultats").html("<div class='statut-loading'></div>");

    data.getHoldings($container);
    return false;
  };

  //Changement de mode d'affichage
  pub.setDisplayMode = function () {
    var $this = $(this);
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");

    var newDisplayMode = $this.attr('data-value');

    // Init
    if (typeof data.Query.query.ScenarioDisplayMode == "undefined") {
      data.Query.query.ScenarioDisplayMode = "";
    }

    data.Query.query.ScenarioDisplayMode = newDisplayMode;   // On applique le nouveau mode
    data.doSearch($container);

    return false;
  };

  pub.refreshFacet = function (e) {
    var $this = $(this);
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");
    var facetValue = $this.val();

    if (typeof data.AjaxFacetContains != "undefined") {
      data.AjaxFacetContains.abort();
    }

    //if (e.keyCode === 13) {
    var facetId = $this.closest('div[data-id]').attr('data-id');
    var parsedFacetContains = {};

    if (ErmesManager.isDefined(data.Query.query.FacetContains)) {
      parsedFacetContains = JSON.parse(data.Query.query.FacetContains);
    }

    parsedFacetContains["_" + facetId] = facetValue; //Chrome workaround : éviter le tri automatique de l'objet json en rendant impossible la conversion de facetId en entier (ajout d'un '_')
    data.Query.query.FacetContains = JSON.stringify(parsedFacetContains);

    data.AjaxFacetContains = $.ajax(
      {
        url: ErmesManager.BasePath + 'Portal/Recherche/Search.svc/RefreshFacet',
        data: JSON.stringify({ query: data.Query.query, facetId: facetId }),
        success: function (json) {
          if (ErmesManager.checkResponse(json)) {
            if (json.d) {
              var facetListHtml = $('<div/>').html(json.d).find('.facet-content').html();
              $this.closest(".panel-group").find('.facet-content').html(facetListHtml);
            } else {
              $this.closest(".panel-group").find('.facet-content').html('');
            }
          }
        }
      });
    //}
  };

  pub.toggleMemorizedUsage = function () {
    var $this = $(this);
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");

    data.Query.query.MemorizedGridEnabled = !data.Query.query.MemorizedGridEnabled;
    data.doSearch($container);
  };

  pub.changeQueryString = function () {
    var $this = $(this);
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");
    data.KeepFilters = true;
    $("#textfield").val(data.Query.query.QueryString);
    $("#textfield").focus();
    $("#textfield").select();

    return false;
  };

  pub.endChangeQueryString = function () {
    var $this = $(this);
    var $container = ErmesManager.findClosestContainer(this);
    var data = $container.data("form");

    data.KeepFilters = false;
  };

  return pub;
}(ErmesManager.callback.list || {}));

ErmesManager.callback.detail = (function (pub) {

  pub.getDetail = function (event) {
    if (ErmesManager.CurrentSearchType === ErmesManager.SearchType.Detail || event.ctrlKey == true) { //En cas d'un double-clic sur une notice dans la liste courte...
      return;
    }
    var $this = $(this);
    var basesArray = ['BLOG', 'CMS'];
    var currentShortNoticeDomElement = $this.closest("li.search-item").find("div.notice_courte");
    var recordBase = currentShortNoticeDomElement.attr("data-base");
    if (typeof recordBase != "undefined" && basesArray.includes(recordBase) && ErmesManager.deactivateDetailedView) {
      var blogUrl = currentShortNoticeDomElement.attr("data-url");
      window.open(blogUrl, '_blank');
    }
    else {
      ErmesManager.CurrentSearchType = ErmesManager.SearchType.Detail;
      var $container = ErmesManager.findClosestContainer(this);
      var data = $container.data("form");
      var recordQuery = {};
      //2 cas : Solr & Pz2
      var index = $this.closest("ul.notice").children("li.search-item").index($this.closest("li.search-item"));
      var recordIndex = $this.closest("li.search-item").find("div.notice_container").siblings("span.numerotation").text();
      var $groupingContainer = $this.closest("div.grouped_results_container");

      var mainIndex = parseInt(recordIndex, 10) - 1;
      var groupingIndex = $groupingContainer.length ?
        $this.closest("tr").index() * 3 + ($this.closest("td.grouped_result").index() + 1) :
        0;

      //PAZPAR2
      if (ErmesManager.isDefined(data.Result[index].Recid)) {
        recordQuery = { query: { Id: data.Result[index].Recid + "_OFFSET_" + groupingIndex, Index: parseInt(recordIndex, 10), NBResults: data.Info.NBResults, SearchQuery: data.Query.query } };
      }
      //SOLR
      else {
        recordQuery = { query: { Id: "" + mainIndex + "_OFFSET_" + groupingIndex, Index: parseInt(recordIndex, 10), NBResults: data.Info.NBResults, SearchQuery: data.Query.query } };
      }

      data.Query = recordQuery;
      data.doSearch($container);
    }

    return false;
  };

  pub.scrollToItem = function () {
    // Pour les smartphones, on scroll au niveau de la notice afin de voir directement le contenu de la notice en raison d'un espace restreint
    // Sinon on se repositionne en haut de page, utile lorsqu'on utilise la pagination du pied de page par exemple

    // On bloque cependant le scroll s'il n'y a aucun resultat.
    if ($(".noResult").length > 0) return;
    if ($(".notice_courte:first, #notice_longue_description").isOnScreen() == 1) { //Not visible
      window.scrollTo(0, $(".searchContainer").offset().top - $('.navbar-compact-wrapper').outerHeight());
    }

    return false;
  };

  pub.backToSearch = function () {
    var $container = ErmesManager.findClosestContainer(this);
    data = $container.data("form");
    $.extend(data.Query.query, data.Query.query.SearchQuery);
    ErmesManager.CurrentSearchType = ErmesManager.SearchType.List;
    var searchSuccessCallback = function (rscId, rscBase) {
      // On tente de récupérer l'élément du DOM correspondant au détail affiché pour se repositionner dessus.
      var $el = $(ErmesManager.selection.generateNoticeCssSelector(rscBase, rscId));
      if ($el && $el[0]) {
        $el[0].scrollIntoView();
      }
    };
    data.doSearch($container, { successCallback: searchSuccessCallback, successCallbackArgs: [data.Result.Resource.RscId, data.Result.Resource.RscBase] });
    return false;
  };

  pub.changeGroupedResult = function () {
    var $container = ErmesManager.findClosestContainer(this);
    var $this = $(this);
    var data = $container.data("form");
    var queryIdParts,
      mainIndex,
      offset;

    if (data.Query && data.Query.query && data.Query.query.Id) {
      queryIdParts = data.Query.query.Id.split("_OFFSET_");
      mainIndex = queryIdParts[0];
      offset = queryIdParts[1];
    }
    else { return; }

    var groupingIndex = $this.index();
    if (groupingIndex >= offset) {
      groupingIndex++;
    }

    data.Query.query.Id = "" + mainIndex + "_OFFSET_" + groupingIndex;
    data.doSearch($container);

    return false;
  };

  pub.goToLoans = function () {
    var $container = ErmesManager.findClosestContainer(this);

    ErmesManager.callback.detail.getDetail.apply(this, Array.prototype.slice.call(arguments));

    $container.one('searchHtmlLoaded', function () {
      $(window).scrollTop($('#detail-holdings').offset().top);
    });

    return false;
  };

  return pub;
}(ErmesManager.callback.detail || {}));

ErmesManager.callback.selection = (function (pub) {

  pub.toggleDetailIntoSelection = function () {
    var data = ErmesManager.findClosestContainer(this).data("form");
    var item = data.Result.Resource;
    ErmesManager.selection.toggleItem(item);
    return false;
  };

  return pub;
}(ErmesManager.callback.selection || {}));

ErmesManager.callback.holding = (function (pub) {

  // Fermeture du détail d'un exemplaire
  pub.hiddenHolding = function () {
    var $this = $(this);
    var $iconCategory = $this.parents(".accordion-group").children(".accordion-heading").children(".accordion-toggle").children("i").attr("class", "icon-plus pull-right");

    return false;
  };

  // Ouverture du détail d'un exemplaire
  pub.shownHolding = function () {
    var $this = $(this);
    var $iconCategory = $this.parents(".accordion-group").children(".accordion-heading").children(".accordion-toggle").children("i").attr("class", "icon-minus pull-right");

    return false;
  };

  return pub;
}(ErmesManager.callback.selection || {}));


//Gestion d'affichage du mode mosaïque avec événement drag & drop

ErmesManager.callback.displayMosaic = (function (pub) {

  //Application de masonry sur le mode d'affichage display-mosaic
  pub.setMosaicDisplay = function () {
    $('#containerSearchList').masonry({
      itemSelector: '.item',
      isFitWidth: true
    });
  };

  //Appel de setMosaicDisplay après le chargement de la dernière image
  pub.waitSearchListLoadImage = function () {
    var total = $('#containerSearchList .item img').length;
    var count = 1;
    $('#containerSearchList .item img').each(function () {
      ErmesManager.afterImgLoad(this, function () {
        if (count == total) {
          ErmesManager.callback.displayMosaic.setMosaicDisplay();
        }
        count++;
      });
    });
    $('.navigation .select-all').attr('style', 'display:none !important');
  };

  return pub;
}(ErmesManager.callback.displayMosaic || {}));

/////////////////////////////////////////////////////////
// Bindings & Init
$(function () {

  /////////////////////////////////////////////////////////
  // Bindings communs

  //Init search Container
  $("div.searchContainer").data("form", new ErmesManager.Form());

  // Câblage événement jquery.Address (deep-linking ajax)
  var handleHashChange = function (newHash, oldHash) {
    if (newHash == '') {
      return;
    }

    var hashArray = newHash.match(/([\s\S]+?)\/([\s\S]+)/),
      $container = $("div.searchContainer"),
      data,
      q;

    try {
      data = $container.data("form");
      q = rison.decode(hashArray[2]);

      if (!(q.query.SearchLabel)) {
        var $tf = $("#textfield");
        $tf.typeahead('destroy').val(q.query.QueryString);
        ErmesManager.setupAutocomplete("#textfield");
      }

      switch (hashArray[1]) {
        case 'Search': ErmesManager.CurrentSearchType = ErmesManager.SearchType.List; break;
        case 'Detail': ErmesManager.CurrentSearchType = ErmesManager.SearchType.Detail; break;
        default: return false;
      }

    } catch (e) {
      if (!oldHash || oldHash == '') {
        q = ErmesManager.getCookieValue(ErmesManager.COOKIES_SEARCH, "search");
      }
    }

    if (q) {
      document.title = ErmesManager.labels.ErmesSearchLoadingPageTitle || "Syracuse - Chargement";

      data.Query = q;
      data.doSearch($container);
    }
  };

  hasher.changed.add(handleHashChange); //add hash change listener
  hasher.initialized.add(handleHashChange); //add initialized listener (to grab initial value in case it is already set)
  hasher.init(); //initialize hasher (start listening for history changes)

  //Binding suppression de tag openfind sur une ressource
  $(document.body).on('click', 'div.themes button.supp', ErmesManager.callback.tag.removeTagResource);

  //Catch submit event
  $(document.body).on('submit', '#main_search_form', function () {
    var textfield = $("#textfield");
    ErmesManager.StopAutocompletion = true;
    ErmesManager.CurrentSearchType = ErmesManager.SearchType.List;
    textfield.autocomplete("close");
    ErmesManager.callback.common.search(textfield, {
      ResultSize: ErmesManager.getCookieValue(ErmesManager.COOKIES_FORM, "resultSize", -1),
      Grid: null,
      ScenarioCode: $("#globalScenario").val(),
      ForceSearch: true,
      CloudTerms: [],
      SearchLabel: "",
      SearchContext: ErmesManager.SearchContexts.SimpleField
    });
    return false;
  });

  //Binding toggle comment form
  $(document.body).on('click', 'button.donner_avis', ErmesManager.callback.comment.showAddCommentForm);

  //Binding ajout panier
  $(document.body).on('click', '.metadata-actions div.memoriser button.main-basket', ErmesManager.callback.basket.addToBasket);
  $(document.body).on('click', '.metadata-actions-preview div.memoriser button.main-basket', ErmesManager.callback.basket.addToBasket);
  $(document.body).on('click', 'div.line-item div.memoriser button.main-basket', ErmesManager.callback.basket.addToBasket);

  //Binding ajout panier en spécifiant un label de panier (dossier)
  $(document.body).on('click', '.metadata-actions div.memoriser .basket-label', ErmesManager.callback.basket.addToBasket);
  $(document.body).on('click', '.metadata-actions-preview div.memoriser .basket-label', ErmesManager.callback.basket.addToBasket);
  $(document.body).on('click', 'div.line-item .basket-label', ErmesManager.callback.basket.addToBasket);

  //Binding capturer notice
  $(document.body).on('click', '.metadata-actions button.capture_notice', ErmesManager.callback.capture.captureNotice);
  $(document.body).on('click', '.metadata-actions-preview button.capture_notice', ErmesManager.callback.capture.captureNotice);
  $(document.body).on('click', '.metadata-actions-compact button.capture_notice', ErmesManager.callback.capture.captureNotice);

  //Binding suppression du panier
  $(document.body).on('click', '.metadata-actions button.oublier', ErmesManager.callback.basket.removeFromBasket);
  $(document.body).on('click', '.metadata-actions-preview button.oublier', ErmesManager.callback.basket.removeFromBasket);
  $(document.body).on('click', 'div.line-item button.oublier', ErmesManager.callback.basket.removeFromBasket);


  /////////////////////////////////////////////////////////
  // Bindings liste

  //Binding show selection form
  $(document.body).on('click', '#resultats button.modify-selection', ErmesManager.callback.ofSelection.showSelectionsForm);

  //Binding page précédente
  $(document.body).on('click', '#resultats_recherche .precedent', ErmesManager.callback.pagination.previousPage);

  //Binding page suivante
  $(document.body).on('click', '#resultats_recherche .suivant', ErmesManager.callback.pagination.nextPage);

  //Binding filtre par facette
  $(document.body).on('click', '.searchContainer ul.facetList li', ErmesManager.callback.list.addFacetFilter);

  //Binding restricteurs de recherche
  $(document.body).on('change', '.searchContainer ul.search-restictors :checkbox', ErmesManager.callback.list.toggleSearchRestrictor);

  //Binding filtre par facette hiérarchique
  $(document.body).on('click', '.searchContainer .hierarchical-facet a:not(.jstree-disabled)', ErmesManager.callback.list.addHierarchicalFacetFilter);

  //Binding changement de page
  $(document.body).on('click', '#resultats_recherche button.page_link', ErmesManager.callback.pagination.changePage);

  // Binding changement de la taille de pagination
  $(document.body).on('click', '.pageSize-container li a', ErmesManager.callback.pagination.changeResultSize);

  //Binding suppression filtre par facette
  $(document.body).on('click', '.removeFacetFilter', ErmesManager.callback.list.removeFacetFilter);
  $(document.body).on('click', '.searchContainer ul.facetList li.disabled', ErmesManager.callback.list.removeFacetFilter);

  //Binding suppression filtre géographique
  $(document.body).on('click', '.removeGeoBounds', ErmesManager.callback.list.removeGeoBounds);

  // Binding facettes en erreur (PazPar2)
  $(document.body).on('click', '.searchContainer ul.facetList li.failed', ErmesManager.callback.list.showFacetError);

  //Binding suppression filtre sur grille
  $(document.body).on('click', '.removeGridFilter', ErmesManager.callback.list.removeGridFilter);

  $(document.body).on('click', '#options_resultat button.facet-see-more', ErmesManager.callback.list.displayMoreFacet);
  $(document.body).on('click', '#options_resultat button.facet-see-less', ErmesManager.callback.list.displayLessFacet);

  //Binding ouverture / fermeture d'une catégorie de facettes
  $(document.body).on('hidden.bs.collapse', '.facet-collapse', ErmesManager.callback.list.hiddenFacetCategory);
  $(document.body).on('shown.bs.collapse', '.facet-collapse', ErmesManager.callback.list.shownFacetCategory);

  //Binding catch link event
  $(document.body).on('click', '#criteres_recherche > ul > li > a:not(.change-query-string) > span', function () { return false; });

  //Binding hover sur notice
  $(document.body).on('mouseenter', '#resultats ul.notice > li', ErmesManager.callback.common.hoverResult);

  //Binding suppression de sélections openfind sur une ressource
  $(document.body).on('click', '#resultats div.selections a.supp', ErmesManager.callback.ofSelection.removeSelectionResource);

  //Binding changement de tri
  $(document.body).on('click', '#resultats_recherche div.criteres_tri .sort-order li a', ErmesManager.callback.list.setSortField);

  //Binding changement restriction par site
  $(document.body).on('click', '.siteRestriction-icon-container li a', ErmesManager.callback.list.changeSiteRestriction);

  //Binding affichage détail
  $(document.body).on('click', '#resultats div.notice_courte div.notice_corps .title, div.notice_courte div.notice_corps .more-info', ErmesManager.callback.detail.getDetail);
  $(document.body).on('click', '#resultats div.vignette_document', ErmesManager.callback.detail.getDetail);
  $(document.body).on('click', '#resultats td.grouped_result', ErmesManager.callback.detail.getDetail);

  //Binding édition template (apparition du conteneur)
  $(document.body).on('click', '#resultats a.EditTemplate', ErmesManager.callback.list.showTemplateEdit);

  //Binding clic sur spellcheck
  $(document.body).on('click', '#spellcheck_link', ErmesManager.callback.list.spellChecking);

  //Capturer la recherche
  $(document.body).on('click', '#capture_search', ErmesManager.callback.capture.captureSearch);

  //Affichage des résultats en doublons
  $(document.body).on('click', '#resultats button.show_grouped_results', ErmesManager.callback.list.showGroupedResults);

  //Hiding des résultats en doublons
  $(document.body).on('click', '#resultats a.hide_grouped_results', ErmesManager.callback.list.hideGroupedResults);

  //Relance de la recherche en affichant tous les doublons
  $(document.body).on('click', '#resultats button.see_all_grouped_results', ErmesManager.callback.list.seeAllGroupedResults);

  // Binding clic sur rebond "grouping"
  $(document.body).on('click', 'button.grouping-rebound', ErmesManager.callback.list.reboundGroupedResults);

  // Binding suppression du rebond "grouping"
  $(document.body).on('click', '.grouping-remove', ErmesManager.callback.list.removeGroupedResultsRebound);

  /////////////////////////////////////////////////////////
  // Bindings détail

  //Binding ajout item selection (liste)
  $(document.body).on('click', '.notice_courte .metadata-actions li.ajouter_selection > a', ErmesManager.callback.selection.toggleItemIntoSelection);

  //Binding ajout item selection (détail)
  $(document.body).on('click', '#notice_longue .metadata-actions li.ajouter_selection', ErmesManager.callback.selection.toggleDetailIntoSelection);

  //Binding page précédente
  $(document.body).on('click', '.detail-icon-container button.precedent, a.precedent', ErmesManager.callback.detail.previousItem);

  //Binding page suivante
  $(document.body).on('click', '.detail-icon-container button.suivant, a.suivant', ErmesManager.callback.detail.nextItem);

  //Binding fermeture alert astuce
  $(document.body).on('click', '.alert a.close', function () { $(this).alert('close'); });

  //Binding onglet on (catch)
  $(document.body).on('click', '#onglets li a.on', function () { return false; });

  //Binding suppression d'un commentaire
  $(document.body).on('click', '#avis_lecteurs button.delete_comment', ErmesManager.callback.comment.invalidateComment);

  //Binding validation d'un commentaire
  $(document.body).on('click', '#avis_lecteurs button.enable_comment', ErmesManager.callback.comment.validateComment);

  //Binding retour résultats recherche
  $(document.body).on('click', '#lien button', ErmesManager.callback.detail.backToSearch);

  //Empêcher de changer l'url par un click sur le bouton pour accéder aux avis.
  $(document.body).on('click', '.avis', function () {
    var element = document.getElementById("detail-notice-avis");
    if (element && element.scrollIntoView) {
      element.scrollIntoView({
        block: 'start',
        behavior: "smooth"
      });
    }
    return false;
  });

  $(document.body).on('click', '.visualisation-button', function () {

    var type = $(this).attr("data-type");
    var data = {};
    var typeOfDevice;
    if (navigator.userAgent.match(/(android|iphone|ipad|blackberry|symbian|symbianos|symbos|netfront|model-orange|javaplatform|iemobile|windows phone|samsung|htc|opera mobile|opera mobi|opera mini|presto|huawei|blazer|bolt|doris|fennec|gobrowser|iris|maemo browser|mib|cldc|minimo|semc-browser|skyfire|teashark|teleca|uzard|uzardweb|meego|nokia|bb10|playbook)/gi)) {
      if (((screen.width >= 480) && (screen.height >= 800)) || ((screen.width >= 800) && (screen.height >= 480)) || navigator.userAgent.match(/ipad/gi)) {
        typeOfDevice = 'tablette';
      } else {
        typeOfDevice = "mobile";
      }
    } else {
      typeOfDevice = "computer";
    }
    var index = $(this).attr("data-id");
    if (type === "document") data.documentId = index;
    if (type === "collection") data.collectionId = index;
    if (type === "json") data.jsonData = $(this).attr("data-value");

    if (type === "youtube") {
      data.youtubeId = $(this).attr("data-value");
      var frameYoutube = $('<embed src="https://www.youtube.com/embed/' + data.youtubeId + '" width="100%" height="100%" />')
      if (typeOfDevice === "computer") {
        $(".right-side-static").empty().append(frameYoutube);
      }
      else {
        $(this).closest(".item").append(frameYoutube);
      }
    }
    else if (type === "dailymotion") {
      data.dailymotionId = $(this).attr("data-value");
      var frameDailymotion = $('<embed src="https://www.dailymotion.com/embed/video/' + data.dailymotionId + '" width="100%" height="100%" />')
      if (typeOfDevice === "computer") {
        $(".right-side-static").empty().append(frameDailymotion);
      }
      else {
        $(this).closest(".item").append(frameDailymotion);
      }
    }
    else if (type === "vimeo") {
      data.vimeoId = $(this).attr("data-value");
      var frameVimeo = $('<embed src="https://player.vimeo.com/video/' + data.vimeoId + '" width="100%" height="100%" />')
      if (typeOfDevice === "computer") {
        $(".right-side-static").empty().append(frameVimeo);
      }
      else {
        $(this).closest(".item").append(frameVimeo);
      }
    }
    else if (!window.viewer) {
      if (typeOfDevice === "computer") ComponentFactory.createInstance('DigitalReadyViewer', { el: "#preview-stand", data: data }).then(function (instance) {
        window.viewer = instance;
        window.viewerElement = viewer.$el;
      });
      else {
        $(this).closest(".item").append("<div id='place-preview'></div>")
        ComponentFactory.createInstance('DigitalReadyViewer', { el: "#place-preview", data: data }).then(function (instance) {
          window.viewer = instance;
          window.viewerElement = viewer.$el;
          $(window.viewerElement).closest(".item");
        });
      }
    }
    else {
      if (type === "document") window.viewer.loadDocument(data);
      if (type === "collection") window.viewer.loadCollection(data);
      if (type === "json") window.viewer.loadJsonData(data.jsonData);

      if (typeOfDevice !== "computer") {
        $(window.viewerElement).show().closest(".item").css("margin-bottom", "inherit");
        $(window.viewerElement).detach().appendTo($(this).closest(".item"));
      }
      else $("#preview-stand").parent().empty().append(window.viewerElement);
    }

    if (typeOfDevice !== "computer") {
      $(this).hide().closest('.preview-buttons').find('.visualisation-cancel').show();
    }

    $('.viewing').removeClass('viewing');
    $(this).closest('.search-item').addClass('viewing');

  });

  // Seulement sur mobile et tablette (< 768px)
  $(document.body).on('click', '.visualisation-cancel', function () {
    if (window.viewer) {
      if ($(this).closest('.item').has('div.panel-default').length > 0) {
        $(window.viewerElement).hide().closest(".item").css("margin-bottom", "inherit");
        $(this).hide().closest('.preview-buttons').find('.visualisation-button.button-hidden-sm').show();
        $('.viewing').removeClass('viewing');
      }
    }
  })

  //Update la position du viewer pour un effet "sticky"
  $(document).on('scroll', ErmesManager.callback.common.updateCustomSticky);
  window.addEventListener("resize", ErmesManager.callback.common.updateCustomSticky);

  //Binding retour résultats recherche
  $(document.body).on('click', "span[data-res-key='Portal|BreadcrumbSearchList']", ErmesManager.callback.detail.backToSearch);

  $(document.body).on('click', '#ariane span.back_to_search > a', ErmesManager.callback.detail.backToSearch);

  //Binding clic sur une notice groupée
  $(document.body).on('click', '#grouped_results_scroll .grouped_result_link', ErmesManager.callback.detail.changeGroupedResult);

  //Binding ouverture / fermeture du détail d'un exemplaire
  $(document.body).on('hidden', '.holding-collapse', ErmesManager.callback.holding.hiddenHolding);
  $(document.body).on('shown', '.holding-collapse', ErmesManager.callback.holding.shownHolding);

  //Binding changement de mode d'affichage
  $(document.body).on('click', '.displaymode-icon-container li a', ErmesManager.callback.list.setDisplayMode);

  //Binding facet.contains
  $(document.body).on("keyup", ".facet-search-term", ErmesManager.callback.list.refreshFacet);

  //Checkbox pour toggle l'utilisation des critères mémorisés
  $(document.body).on('change', '.toggle-memorized-usage', ErmesManager.callback.list.toggleMemorizedUsage);

  //Changement query string
  $('body').on('click', '.change-query-string', ErmesManager.callback.list.changeQueryString);
  $('body').on('blur', '#textfield', ErmesManager.callback.list.endChangeQueryString);
});
