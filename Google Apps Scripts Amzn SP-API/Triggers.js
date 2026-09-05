function listTriggers() {
  var triggers = ScriptApp.getProjectTriggers();

  if (triggers.length > 0) {
    for (var i = 0; i < triggers.length; i++) {
      var trigger = triggers[i];
      Logger.log('Trigger ' + (i + 1) + ':');
      Logger.log('Handler function: ' + trigger.getHandlerFunction());
      Logger.log('Trigger type: ' + trigger.getEventType());
      Logger.log('Trigger source: ' + trigger.getTriggerSource());
      Logger.log('Trigger id: ' + trigger.getUniqueId());

      // Check if the trigger is a time-driven trigger
      if (trigger.getTriggerSource() == ScriptApp.TriggerSource.CLOCK) {
        // Get the next run time
        var nextRun = trigger.getUniqueId();
        Logger.log('Next run: ' + nextRun);
      } else {
        Logger.log('Trigger is not time-driven.');
      }
      Logger.log('-----');
    }
  } else {
    Logger.log('No triggers found.');
  }
}


function deleteTriggersByHandlerFunctions() {
  const targetFunctions = ["confirmAndDownloadProcessing", "confirmAndDownloadProcessingForDCD", "confirmAndDownloadProcessingForCMP", "submitPriceAndInventoryFeed", "submitPriceAndInventoryFeedforDCD", "submitPriceAndInventoryFeedforCMP", "confirmAndDownloadProcessingForFGX", "confirmAndDownloadProcessingForFGXCA", "confirmAndDownloadProcessingForTPS"];
  var triggers = ScriptApp.getProjectTriggers();

  if (triggers.length > 0) {
    for (var i = 0; i < triggers.length; i++) {
      var trigger = triggers[i];
      const handlerFunction = trigger.getHandlerFunction();
      for (var j = 0; j < targetFunctions.length; j++) {
        if (handlerFunction === targetFunctions[j]) {
          ScriptApp.deleteTrigger(trigger);
          Logger.log('Trigger associated with function "' + handlerFunction + '" deleted.');
          break; // Exit the inner loop after finding a match
        }
      }
    }
  } else {
    Logger.log('No triggers found.');
  }
}


function updateTriggerToRunEvery15Minutes() {
  var triggers = ScriptApp.getProjectTriggers();

  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];

    if (trigger.getHandlerFunction() === 'importInventoryFromEmail') {
      // Delete the existing trigger
      ScriptApp.deleteTrigger(trigger);

      // Create a new trigger to run every 15 minutes
      ScriptApp.newTrigger('importInventoryFromEmail')
        .timeBased()
        .everyMinutes(15)
        .create();

      Logger.log('Trigger updated to run every 15 minutes.');

      // Exit the loop since we've updated the trigger
      break;
    }
  }
}

