var log_Sheet = spreadsheet.getSheetByName('Log');

function confirmFeedProcessing3(feedId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var feedId = data[i][8]; // Column I
    var processingStatus = data[i][9]; // Column J

    if (!feedId || processingStatus === 'DONE' || processingStatus === 'CANCELLED' || processingStatus === 'FATAL') {
      continue;
    }

    var endpoint = 'https://sellingpartnerapi-na.amazon.com/feeds/2021-06-30/feeds/' + feedId;
    var headers = {
      'Content-Type': 'application/json',
      'x-amz-access-token': accessToken,
      'x-amz-date': getCurrentDateTime(),
      'User-Agent': 'Google Apps Script/1.0 (Language=JavaScript)'
    };

    var response = UrlFetchApp.fetch(endpoint, { 'method': 'GET', 'headers': headers, 'muteHttpExceptions': true });
    var responseData = JSON.parse(response.getContentText());
    console.log("Confirm Feed Processing Response: ", responseData);

    // Update log sheet
    sheet.getRange(i + 1, 10).setValue(responseData.processingStatus || 'Status not available');
    sheet.getRange(i + 1, 11).setValue(responseData.marketplaceIds ? responseData.marketplaceIds.join(', ') : '');
    sheet.getRange(i + 1, 12).setValue(responseData.createdTime || '');

    // Call the downloader if feed is processed
    if (responseData.processingStatus === 'DONE' && responseData.resultFeedDocumentId) {
      downloadFeedProcessingReport(responseData.resultFeedDocumentId, feedId, i + 1);
    }
  }
}

function downloadFeedProcessingReport3(feedDocumentId, feedId, rowIndex) {
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