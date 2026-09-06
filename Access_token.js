// Configuration
var properties = PropertiesService.getDocumentProperties();
var CLIENT_ID = properties.getProperty('CLIENT_ID');
var CLIENT_SECRET = properties.getProperty('CLIENT_SECRET');
var REFRESH_TOKEN = properties.getProperty('REFRESH_TOKEN');
var TOKEN_URL = 'https://api.amazon.com/auth/o2/token'; // Amazon's token endpoint

// Function to retrieve access token using refresh token
function getAccessToken() {
  var properties = PropertiesService.getDocumentProperties();
  var payload = {
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN
  };

  var options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload
  };

  var response = UrlFetchApp.fetch(TOKEN_URL, options);
  var tokenData = JSON.parse(response.getContentText());
  Logger.log(response);
  properties.setProperty('access_token', tokenData.access_token);
  properties.setProperty('expires_in', tokenData.expires_in);
  properties.setProperty('token_type', tokenData.token_type);

}

// Function to store access token and related data securely
function storeAccessToken(tokenData) {
  var properties = PropertiesService.getDocumentProperties();
  scriptProperties.setProperties({
    'access_token': tokenData.access_token,
    'token_type': tokenData.token_type,
    'expires_in': tokenData.expires_in,
    'refresh_token': tokenData.refresh_token
  });
}

function displayAllProperties() {
  var properties = PropertiesService.getDocumentProperties();
  var allProperties = properties.getProperties();
  for (var key in allProperties) {
    Logger.log(key + ' = ' + allProperties[key]);
  }
}

function saveCredentialManually() {
  var properties = PropertiesService.getDocumentProperties();
  properties.setProperty('CLIENT_ID', 'amzn1.application-oa2-client.023c66ec1ad74ff095e1d1666c8a4888');
  properties.setProperty('CLIENT_SECRET', 'YOUR_CLIENT_SECRET');
  properties.setProperty('REFRESH_TOKEN', 'YOUR_REFRESH_TOKEN');
  Logger.log("CLIENT_ID Saved");
  Logger.log("CLIENT_SECRET Saved");
  Logger.log("REFRESH_TOKEN Saved");

}


function clearProperties() {
  var properties = PropertiesService.getDocumentProperties();
  properties.deleteProperty('access_token');
  properties.deleteProperty('token_type');
  properties.deleteProperty('expires_in');
  properties.deleteProperty('access_token_created_at');
  properties.deleteProperty('access_token_expires_at');
}

function deleteAllDocumentProperties() {
  PropertiesService.getDocumentProperties().deleteAllProperties();
}