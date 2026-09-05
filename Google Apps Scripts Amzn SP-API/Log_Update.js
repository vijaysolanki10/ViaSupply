var log_Sheet = spreadsheet.getSheetByName('Log');


function confirmFeedProcessing2(feedId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log'); // Replace with your sheet name
  var data = sheet.getDataRange().getValues(); // Get all data from the sheet


  for (var i = 1; i < data.length; i++) { // Start from row 2 to skip headers
    var feedId = data[i][8]; // Column I (zero-based index, so column I is 8)
    var processingStatus = data[i][9]; // Column J (zero-based index, so column J is 9)

    if (processingStatus === 'DONE' || processingStatus === 'CANCELLED' || processingStatus === 'FATAL' || !feedId) {
      continue; // Skip if processingStatus is 'DONE' or feedId is empty
    }

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
    sheet.getRange(i + 1, 10).setValue(responseData.processingStatus || 'Status not available');
    sheet.getRange(i + 1, 11).setValue(responseData.marketplaceIds.join(', '));
    sheet.getRange(i + 1, 12).setValue(responseData.createdTime);

    if (responseData.processingStatus === 'DONE') {
      var resultFeedDocumentId = responseData.resultFeedDocumentId;
      downloadFeedProcessingReport2(resultFeedDocumentId, feedId, i + 1);
    }
    Utilities.sleep(10000);
  }
}

function downloadFeedProcessingReport2(feedDocumentId, feedId, rowIndex) {
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

  log_Sheet.getRange(rowIndex, 13).setValue(responseData.url);
}