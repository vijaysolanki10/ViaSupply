// Configuration
var properties = PropertiesService.getDocumentProperties();
var CLIENT_ID = properties.getProperty('CLIENT_ID');
var CLIENT_SECRET = properties.getProperty('CLIENT_SECRET');
var REFRESH_TOKEN = properties.getProperty('REFRESH_TOKEN');
var TOKEN_URL = 'https://api.amazon.com/auth/o2/token'; // Amazon's token endpoint

// Function to retrieve access token using refresh token
function getAccessToken() {
  var properties = PropertiesService.getDocumentProperties();
  var accessToken = properties.getProperty('access_token');
  var expiresAt = Number(properties.getProperty('expires_in'));
  var safetyMargin = 1 * 60 * 1000;

  if (accessToken && expiresAt && (Date.now() + safetyMargin) < expiresAt) {
    return accessToken;
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    accessToken = properties.getProperty('access_token');
    expiresAt = Number(properties.getProperty('expires_in'));
    if (accessToken && expiresAt && (Date.now() + safetyMargin) < expiresAt) {
      return accessToken;
    }

    var payload = {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN
    };

    var options = {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: payload,
      muteHttpExceptions: true
    };


    try {
      var response = UrlFetchApp.fetch(TOKEN_URL, options);
      var tokenData = JSON.parse(response.getContentText());
      Logger.log(response);
      if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || !tokenData.access_token) {
        throw new Error('Amazon token request failed: ' + response.getContentText());
      }

      properties.setProperties({
        'access_token': tokenData.access_token,
        'token_type': tokenData.token_type,
        'expires_in': String(Date.now() + (Number(tokenData.expires_in) * 1000))
      });

      return tokenData.access_token;
    } catch (error) {
      Logger.log('First access-token attempt failed: ' + error.message);
      Utilities.sleep(12000);
    }

    try {
      var response = UrlFetchApp.fetch(TOKEN_URL, options);
      var tokenData = JSON.parse(response.getContentText());
      Logger.log(response);
      if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || !tokenData.access_token) {
        throw new Error('Amazon token request failed: ' + response.getContentText());
      }

      properties.setProperties({
        'access_token': tokenData.access_token,
        'token_type': tokenData.token_type,
        'expires_in': String(Date.now() + (Number(tokenData.expires_in) * 1000))
      });

      return tokenData.access_token;
    } catch (error) {
      Logger.log('Second access-token attempt failed: ' + error.message);
      throw error;
    }
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}
