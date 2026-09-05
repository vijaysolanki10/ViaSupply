function fetchUpdatePriceNQtyAFJ() {
  var databaseSpreadsheetId = '1pGH0ac47rmIOpQNMZ7sYeavn4Mrl3eC68gK8d7O-DN4';
  var databaseSheetName = 'AFJ_DATA';
  var AFJAmazonSheet = 'AFJ';

  var priceSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var priceSheet = priceSpreadsheet.getSheetByName(AFJAmazonSheet);

  var databaseSpreadsheet = SpreadsheetApp.openById(databaseSpreadsheetId);
  var databaseSheet = databaseSpreadsheet.getSheetByName(databaseSheetName);
  var databaseValues = databaseSheet.getDataRange().getValues();

  var priceLookup = {};
  var qtyLookup = {};
  for (var i = 1; i < databaseValues.length; i++) {
    var key = databaseValues[i][1];
    priceLookup[key] = databaseValues[i][11];
    qtyLookup[key] = databaseValues[i][4];
  }

  var priceValues = priceSheet.getDataRange().getValues();
  var numRows = priceValues.length - 1;

  // Step 1: Copy L -> K and E -> S
  priceSheet.getRange(2, 11, numRows, 1).setValues(priceSheet.getRange(2, 12, numRows, 1).getValues()); // L->K
  priceSheet.getRange(2, 19, numRows, 1).setValues(priceSheet.getRange(2, 5, numRows, 1).getValues());  // E->S

  // Step 2: Read copied 'last' values from K and S
  var oldPrices = priceSheet.getRange(2, 11, numRows, 1).getValues(); // K
  var oldQtys = priceSheet.getRange(2, 19, numRows, 1).getValues();   // S

  // Step 3: Prepare updated values
  var updatedPrices = [];
  var updatedQtys = [];
  var updatedStatus = [];
  var changeFlags = [];

  for (var j = 1; j <= numRows; j++) {
    var row = priceValues[j];
    var lookupKey = row[1];

    var oldPrice = oldPrices[j - 1][0];
    var oldQty = oldQtys[j - 1][0];

    var newPrice = priceLookup[lookupKey] !== undefined ? priceLookup[lookupKey] : row[11];
    var newQty = qtyLookup[lookupKey] !== undefined ? qtyLookup[lookupKey] : 0;

    updatedPrices.push([newPrice]);
    updatedQtys.push([newQty]);

    var status = (newQty > 1 && newPrice <= 99) ? "ENABLED" : "DISABLED";
    updatedStatus.push([status]);

    var isChanged = (oldPrice !== newPrice) || (oldQty !== newQty);
    changeFlags.push([isChanged ? "Y" : "N"]);
  }

  // Step 4: Apply updated values
  priceSheet.getRange(2, 12, numRows, 1).setValues(updatedPrices);  // Column L
  priceSheet.getRange(2, 5, numRows, 1).setValues(updatedQtys);     // Column E
  priceSheet.getRange(2, 17, numRows, 1).setValues(updatedStatus);  // Column Q
  priceSheet.getRange(2, 18, numRows, 1).setValues(changeFlags);    // Column R

  Logger.log("Update completed successfully.");
  Utilities.sleep(10000);
  submitPriceAndInventoryFeedForAFJ();
}


var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
var accessToken = getAccessToken();
var logSheet = spreadsheet.getSheetByName('Log');

function submitPriceAndInventoryFeedForAFJ() {
  var feedContent = constructFeedContentForAFJ();
  var destinationData = createFeedDocument();
  uploadFeedData(destinationData.url, feedContent);
  var feedId = createFeed(destinationData.url, destinationData.feedDocumentId);
  var lastRow = logSheet.getLastRow();
  logSheet.getRange('A' + lastRow).setValue("AFJ");
}

function confirmAndDownloadProcessingForAFJ() {
  var lastRow = logSheet.getLastRow();
  var feedId = logSheet.getRange('I' + lastRow).getValue();
  confirmFeedProcessing(feedId); // Assuming you want to use the same confirmation function
}

function constructFeedContentForAFJ() {
  var sheet = spreadsheet.getSheetByName('AFJ');
  var lastRow = sheet.getLastRow();

  var dataRange = sheet.getRange('C2:S' + lastRow); // Column C to S (3 to 19) includes Column R (index 15 in range)
  var values = dataRange.getValues();

  var feedContent = {
    "header": {
      "sellerId": "AANWX3X1J38LG",
      "version": "2.0",
      "issueLocale": "en_US"
    },
    "messages": []
  };

  var messageId = 1;
  values.forEach(function (row) {
    var sku = row[0];         // Column C
    var quantity = row[1];    // Column D
    var flag = row[15];       // Column R (index 15 in C-S range)
    var price = row[3];       // Column F

    if (flag === "N") return; // Skip unchanged rows

    var message = {
      "messageId": messageId++,
      "sku": sku,
      "operationType": "PATCH",
      "productType": "PRODUCT",
      "patches": [
        {
          "op": "replace",
          "path": "/attributes/purchasable_offer",
          "value": [
            {
              "audience": "ALL",
              "currency": "USD",
              "our_price": [
                {
                  "schedule": [
                    {
                      "value_with_tax": price
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "op": "merge",
          "path": "/attributes/fulfillment_availability",
          "value": [
            {
              "fulfillment_channel_code": "DEFAULT",
              "quantity": quantity
            }
          ]
        }
      ]
    };

    feedContent.messages.push(message);
  });

  return JSON.stringify(feedContent);
}