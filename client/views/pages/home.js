selectedItemsCount = new ReactiveVar(0);
searchField = new ReactiveVar("importedDate");
searchFieldType = new ReactiveVar("date");
specifySkipItems = new ReactiveVar(false);
setAPIEndpoint = new ReactiveVar(false);

fetchEvent.addListener('complete', function(newAdditions) {
  toastr.success(newAdditions + " CGSpace items imported", "Success!", {timeOut: 0, "extendedTimeOut": 0});
});

Template.home.helpers({
  totalItems: function(){
    return Counts.get("pendingItemsCount");
  },
  totalTweetedItems: function(){
    return Counts.get("tweetedItemsCount");
  },
  selectedItemsCount: function () {
    return selectedItemsCount.get();
  },
  selectedSearchField: function(){
    return searchField.get();
  },
  showDateSearchForm: function(){
    return searchFieldType.get() == "date";
  },
  skipItems: function(){
    return specifySkipItems.get();
  },
  setEndpoint: function(){
    return setAPIEndpoint.get();
  }
});

Template.home.events({
  "change #all-items": function (e, t) {
    if (e.target.checked) {
      t.$("table tbody tr>td input").prop("checked", true);
      Session.set("isNotificationSelected", true);
    } else {
      t.$("table tbody tr>td input").prop("checked", false);
      Session.set("isNotificationSelected", false);
    }
    t.$("table tbody tr>td input").trigger("change");
  },
  "change input.item-selected": function(e, t){
    if (e.target.checked) {
      selectedItemsCount.set(selectedItemsCount.get() + 1);
      if(t.$("table tbody tr>td input:checked").length == t.$("table tbody tr>td input").length){
        t.$("input#all-items").prop("checked", true);
      }
    } else {
      selectedItemsCount.set(selectedItemsCount.get() - 1);
      t.$("input#all-items").prop("checked", false);
    }
  },
  "click #fetch-items": function (e, t) {
    var endPoint = t.$("#endpoint").val();

    var minNumberOfItems = parseInt(t.$("#items-to-fetch").attr("min"), 10);
    var newNumberOfItems = parseInt(t.$("#items-to-fetch").val(), 10);
    var maxNumberOfItems = parseInt(t.$("#items-to-fetch").attr("max"), 10);

    var newNumberOfItemsToSkip = null;

    if(specifySkipItems.get()){

      var minNumberOfItemsToSkip = parseInt(t.$("#items-to-skip").attr("min"), 10);
      newNumberOfItemsToSkip = parseInt(t.$("#items-to-skip").val(), 10);
      var maxNumberOfItemsToSkip = parseInt(t.$("#items-to-skip").attr("max"), 10);

      if(newNumberOfItemsToSkip < minNumberOfItemsToSkip){
        newNumberOfItemsToSkip = minNumberOfItemsToSkip;
      } else if(newNumberOfItemsToSkip > maxNumberOfItemsToSkip){
        newNumberOfItemsToSkip = maxNumberOfItemsToSkip;
      }
    }

    if(newNumberOfItems < minNumberOfItems){
      newNumberOfItems = minNumberOfItems;
    } else if(newNumberOfItems > maxNumberOfItems){
      newNumberOfItems = maxNumberOfItems;
    }

    Meteor.call("getCGSpaceItems", {limit: newNumberOfItems, offset: newNumberOfItemsToSkip}, endPoint, function(error){
      if(error) {
        toastr.error(error, "Error while getting items from CGSpace, please try again!");
      } else {
        toastr.info("CGSpace items are being imported.", "Import Started");
      }
    });
  },
  "keyup #items-to-fetch": function(e, t){
    if(e.keyCode == 13){
      t.$("#fetch-items").trigger("click");
    }
  },
  "click table thead th.sortable": function(e, t){
    t.$("table thead th.active").removeClass("active");
    t.$(e.target).addClass("active");

    searchField.set(t.$(e.target).data("sort-field"));
    searchFieldType.set(t.$(e.target).data("sort-field-type"));

    // Move the sorter to the header
    t.$("#sorter").appendTo(t.$(e.target));
  },
  "click table thead th.sortable div#sorter": function(e, t){
    e.stopPropagation();
  },
  "click table thead th.sortable i": function(e, t){
    e.stopPropagation();
    var sortDirection = 1;

    t.$("i.active").removeClass("active");
    t.$(t.$(e.target)).addClass("active");

    if(t.$(e.target).hasClass("fa-chevron-circle-up")){
      sortDirection = 1;
    } else {
      sortDirection = -1;
    }

    sortKey = searchField.get();
    sortOption = {};
    sortOption[sortKey] = sortDirection;

    Items.set({
      sort: sortOption
    });
  },
  "click #search-items": function(e, t){
    var selectedField = searchField.get();
    var searchTerm = t.$("#search-term").val().trim();
    if(searchTerm){
      var searchFilter = {};
      searchFilter[selectedField] = {$regex : ".*"+ searchTerm +".*", $options: '-i'};
      Items.set({
        filters: searchFilter
      });
    } else {
      toastr.info("Please type in your search term");
    }
  },
  "keyup #search-term": function(e, t){
    if(e.keyCode == 13){
      t.$("#search-items").trigger("click");
    } else if(e.keyCode == 27){ // ESC key means reset
      e.target.value = "";
      Items.set({
        filters: {}
      });
    }
  }
});

Template.item.helpers({
  lastModified: function(){
    return moment(this.lastModified).format('YYYY-MM-DD');
  },
  importedOn: function(){
    return moment(this.importedDate).format('YYYY-MM-DD');
  }
});

Template.itemSelect.helpers({
  alreadyTweeted: function(){
    return this.tweeted;
  }
});

Template.itemSelect.onRendered(function(){
  $.material.checkbox();
  $("input#all-items").prop("checked", false);
  selectedItemsCount.set($("table tbody tr>td input:checked").length);
});

Template.dateSearchForm.events({
  "click #search-items-by-date": function(e, t){
    var selectedField = searchField.get();

    var afterDateString = t.$("#search-after-date").val().trim();
    var beforeDateString = t.$("#search-before-date").val().trim();

    if(afterDateString == "" && beforeDateString == ""){ // no dates picked
      toastr.info("Please pick a date!");
    } else {
      var afterDate, beforeDate = null;
      var searchFilter = {}

      if(afterDateString != ""){
        afterDate = moment(afterDateString, "MM/DD/YYYY h:mm A");
      }

      if(beforeDateString != ""){
        beforeDate = moment(beforeDateString, "MM/DD/YYYY h:mm A");
      }

      if(afterDate && beforeDate){ // search in specified range
        if(beforeDate > afterDate){
          searchFilter[selectedField] = {
            $gte: afterDate.toDate(),
            $lte: beforeDate.toDate()
          }
        } else {
          toastr.info("Please make sure your selected date range is correct!");
        }
      } else if(afterDate) {     // search after specified date
        searchFilter[selectedField] = {
          $gte: afterDate.toDate()
        }
      } else if(beforeDate) {   // search before specified date
        searchFilter[selectedField] = {
          $lte: beforeDate.toDate()
        }
      }
    }

    if(searchFilter[selectedField]){ // make sure filter is specified
      Items.set({
        filters: searchFilter
      });
    }
  },
  "click #clear-search-items-by-date": function(e, t){
    t.$(".picker").val("");
    Items.set({
      filters: {}
    });
  }
});

Template.dateSearchForm.helpers({
  selectedSearchField: function(){
    return searchField.get();
  }
});

Template.dateSearchForm.onRendered(function(){
  this.$('.datetimepicker').datetimepicker();
});

Template.skipSpecifyOption.events({
  "change #skip-items": function(e, t){
    if(e.target.checked){
      specifySkipItems.set(true);
    } else {
      specifySkipItems.set(false);
    }
  }
});

Template.skipSpecifyOption.onRendered(function(){
    $.material.checkbox();
});



Template.setAPIEndpointOption.events({
  "change #set-endpoint": function(e, t){
    if(e.target.checked){
      setAPIEndpoint.set(true);
    } else {
      setAPIEndpoint.set(false);
    }
  }
});

Template.setAPIEndpointOption.onRendered(function(){
    $.material.checkbox();
});
