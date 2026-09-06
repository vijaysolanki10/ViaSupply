var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
var accessToken = getAccessToken();
var logSheet = spreadsheet.getSheetByName('Log');

function submitPriceAndInventoryFeedCA() {
  var feedContent = constructFeedContentCA();
  var destinationData = createFeedDocumentCA();
  uploadFeedDataCA(destinationData.url, feedContent);
  var feedId = createFeedCA(destinationData.url, destinationData.feedDocumentId);

  ScriptApp.newTrigger("confirmAndDownloadProcessingCA")
    .timeBased()
    .after(5 * 60 * 1000)
    .create();
}

function confirmAndDownloadProcessingCA() {
  var lastRow = logSheet.getLastRow();
  var feedId = logSheet.getRange('I' + lastRow).getValue();
  confirmFeedProcessingCA(feedId);
}

function constructFeedContentCA() {
  var sheet = spreadsheet.getSheetByName('TEST_DCD');
  var dataRange = sheet.getRange('C2:F' + sheet.getLastRow());
  var values = dataRange.getValues();

  var feedContent = {
    "header": {
      "sellerId": "AANWX3X1J38LG", // Replace with your actual seller ID
      "version": "2.0",
      "issueLocale": "en_US"
    },
    "messages": []
  };

  values.forEach(function (row, index) {
    var sku = row[0];         // Column C: SKU
    var quantity = row[1];    // Column D: Quantity
    var price = row[3];       // Column F: Price

    var message = {
      "messageId": index + 1,
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
              ],
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

function createFeedDocumentCA() {
  var endpoint = 'https://sellingpartnerapi-na.amazon.com/feeds/2021-06-30/documents';
  var headers = {
    'Content-Type': 'application/json',
    'x-amz-access-token': accessToken,
    'x-amz-date': getCurrentDateTime(),
    'User-Agent': 'Google Apps Script/1.0 (Language=JavaScript)'
  };
  var payload = {
    contentType: 'application/json; charset=UTF-8',
    compressionAlgorithm: 'GZIP'
  };
  var options = {
    'method': 'POST',
    'headers': headers,
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  var response = UrlFetchApp.fetch(endpoint, options);
  var responseData = JSON.parse(response.getContentText());
  var responseHeaders = response.getAllHeaders();
  console.log("Create Feed Document Response Code: ", response.getResponseCode());
  console.log("Create Feed Document Response: ", responseData);

  if (responseData.errors) {
    console.error("Error creating feed document: " + responseData.errors);
    return null;
  } else {
    var newRow = ['', '', response.getResponseCode(), responseHeaders['x-amz-apigw-id'], responseHeaders['x-amzn-requestid'], responseHeaders['x-amzn-trace-id'], responseData.feedDocumentId, responseData.url];
    logSheet.appendRow(newRow);
    return responseData;
  }
}

function uploadFeedDataCA(destinationURL, feedContent) {
  var contentType = 'application/json; charset=UTF-8';
  var options = {
    'method': 'PUT',
    'payload': feedContent,
    'headers': {
      'Content-Type': contentType,
    },
    'muteHttpExceptions': true
  };
  var response = UrlFetchApp.fetch(destinationURL, options);
  console.log("Upload Feed Data Response: ", response.getContentText());
}

function createFeedCA(destinationURL, inputFeedDocumentId) {
  var feedType = 'JSON_LISTINGS_FEED';
  var marketplaceIds = ['A2EUQ1WTGCTBG2'];
  var feedOptions = {};
  var endpoint = 'https://sellingpartnerapi-na.amazon.com/feeds/2021-06-30/feeds';
  var headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-amz-access-token': accessToken,
    'x-amz-date': getCurrentDateTime(),
    'User-Agent': 'Google Apps Script/1.0 (Language=JavaScript)'
  };
  var payload = {
    'feedType': feedType,
    'marketplaceIds': marketplaceIds,
    'inputFeedDocumentId': inputFeedDocumentId,
    'feedOptions': feedOptions
  };
  var options = {
    'method': 'POST',
    'headers': headers,
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  var response = UrlFetchApp.fetch(endpoint, options);
  var responseData = JSON.parse(response.getContentText());
  console.log("Create Feed Response: ", responseData);
  var lastRow = logSheet.getLastRow();
  var feedId = responseData.feedId;
  logSheet.getRange('I' + lastRow).setValue(feedId);
  return feedId;
}

function confirmFeedProcessingCA(feedId) {
  var endpoint = 'https://sellingpartnerapi-na.amazon.com/feeds/2021-06-30/feeds/' + feedId;
  var headers = {
    'Content-Type': 'application/json',
    'x-amz-access-token': accessToken,
    'x-amz-date': getCurrentDateTime(),
    'User-Agent': 'Google Apps Script/1.0 (Language=JavaScript)'
  };
  var options = {
    'method': 'GET',
    'headers': headers,
    'muteHttpExceptions': true
  };
  var response = UrlFetchApp.fetch(endpoint, options);
  var responseData = JSON.parse(response.getContentText());
  console.log("Confirm Feed Processing Response: ", responseData);
  var lastRow = logSheet.getLastRow();
  logSheet.getRange('I' + lastRow).setValue(feedId);
  logSheet.getRange('J' + lastRow).setValue(responseData.processingStatus || 'Status not available');
  logSheet.getRange('K' + lastRow).setValue(responseData.marketplaceIds.join(', '));
  logSheet.getRange('L' + lastRow).setValue(responseData.createdTime);

  if (responseData.processingStatus === 'DONE') {
    var resultFeedDocumentId = responseData.resultFeedDocumentId;
    downloadFeedProcessingReportCA(resultFeedDocumentId, feedId);
  }
}

function downloadFeedProcessingReportCA(feedDocumentId, feedId) {
  var endpoint = 'https://sellingpartnerapi-na.amazon.com/feeds/2021-06-30/documents/' + feedDocumentId;
  var headers = {
    'Content-Type': 'application/json',
    'x-amz-access-token': accessToken,
    'x-amz-date': getCurrentDateTime(),
    'User-Agent': 'Google Apps Script/1.0 (Language=JavaScript)'
  };
  var options = {
    'method': 'GET',
    'headers': headers,
    'muteHttpExceptions': true
  };
  var response = UrlFetchApp.fetch(endpoint, options);
  console.log("Download Feed Processing Report Response: ", response.getContentText());
  var responseData = JSON.parse(response.getContentText());

  var lastRow = logSheet.getLastRow();
  logSheet.getRange('M' + lastRow).setValue(responseData.url);
}