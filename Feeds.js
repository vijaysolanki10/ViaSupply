var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
var accessToken = getAccessToken();
var logSheet = spreadsheet.getSheetByName('Log');

function submitPriceAndInventoryFeed() {
  var feedContent = constructFeedContent();
  var destinationData = createFeedDocument();
  uploadFeedData(destinationData.url, feedContent);
  var feedId = createFeed(destinationData.url, destinationData.feedDocumentId);

  ScriptApp.newTrigger("confirmAndDownloadProcessing")
    .timeBased()
    .after(5 * 60 * 1000)
    .create();
}

function confirmAndDownloadProcessing() {
  var lastRow = logSheet.getLastRow();
  var feedId = logSheet.getRange('I' + lastRow).getValue();
  confirmFeedProcessing(feedId);
}

function constructFeedContent() {
  var sheet = spreadsheet.getSheetByName('DCD');
  var dataRange = sheet.getRange('C2:F' + sheet.getLastRow());
  var values = dataRange.getValues();
  var feedContent = "SKU\tPrice\tQuantity\n";

  values.forEach(function (row) {
    feedContent += row[0] + "\t" + row[3] + "\t" + row[1] + "\n";
  });

  return feedContent;
}

function createFeedDocument() {
  var endpoint = 'https://sellingpartnerapi-na.amazon.com/feeds/2021-06-30/documents';
  var headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
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

function uploadFeedData(destinationURL, feedContent) {
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

function createFeed(destinationURL, inputFeedDocumentId) {
  var feedType = 'JSON_LISTINGS_FEED';
  var marketplaceIds = ['ATVPDKIKX0DER'];
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

function confirmFeedProcessing(feedId) {
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
    downloadFeedProcessingReport(resultFeedDocumentId, feedId);
  }
}

function downloadFeedProcessingReport(feedDocumentId, feedId) {
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


function getCurrentDateTime() {
  var now = new Date();
  var year = now.getFullYear();
  var month = ('0' + (now.getMonth() + 1)).slice(-2);
  var day = ('0' + now.getDate()).slice(-2);
  var hours = ('0' + now.getHours()).slice(-2);
  var minutes = ('0' + now.getMinutes()).slice(-2);
  var seconds = ('0' + now.getSeconds()).slice(-2);
  return year + month + day + 'T' + hours + minutes + seconds + 'Z';
}
