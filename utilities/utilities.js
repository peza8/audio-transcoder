/*
 *	Utility functions that are generic broadly 
 *  needed around the project
 *
 *  Author: Josh Perry
 *  25 February 2019
 */

// External imports
var fs = require('fs');

class Utilities{
    consttructor(){
        // NA
    }
}

// File handling
Utilities.deleteDirectorySync = function(directory) {
    if (fs.existsSync(directory)) {
        var files = fs.readdirSync(directory)

        for (var i in files) {
            var file = files[i];
            var currentPath = directory + "/" + file;
            if (fs.lstatSync(currentPath).isDirectory()) { 
                break;
            } else { 
                // delete file
                fs.unlinkSync(currentPath);
            }            
        }
            
        fs.rmdirSync(directory);
    }
}

Utilities.deleteFileSync = function(filepath) {
    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
    } else {
        console.log(`UTILITIES: Error, no file to delete at path ${filepath}`);
    }
}

Utilities.listContentsOfDir = function(directory) {
    console.log(`UTILITIES: Listing files at ${directory}`);
    fs.readdirSync(directory).forEach(file => {
        console.log(file);
    });
}

// Date handling
Utilities.dateStringFromDate = function(dateObj){
        
    // Takes in a Milisecond timestamp and converts it to date string, format: YYYY-MM-DD 
    if (!(dateObj instanceof Date)){
      // Invalid timestamp entry, set default signup date
      return 'undefined_date';
    }

    const year  = dateObj.getFullYear();
    var   month = dateObj.getMonth() + 1; // Jamuary = 0
    var   day   = dateObj.getDate();

    // Pad Day/Month value if necessary 
    if (day < 10) {
        day = '0' + day;
    }

    if (month < 10) {
        month = '0' + month;
    }

    const date_string = year + '-' + month + '-' + day;
    return date_string;
}


Utilities.sortArrOfStringNumbers = function(stringNumbers) {
    // Takes e.g. = ['8', '1', '10', '7', '2', '3'] -> ['1', '2', '3', '7', '8', '10']
    // Convert array to array of numbers
    numArray = []
    for (var i in stringNumbers) {
        let stringNum = stringNumbers[i];
        let num = Number(stringNum);
        numArray.push(num);
    }

    // Sort the num array
    numArray.sort(function(a, b) {
        return a - b;
      });
    
    // Recreate string number array
    var orderedStringNumArray = [];
    for(var j in numArray){
        let num = numArray[j];
        orderedStringNumArray.push(num.toString());
    }

    return orderedStringNumArray;
}

Utilities.maxValueOfStringNumbers = function(stringNumbers) {
    numArray = []
    for (var i in stringNumbers) {
        let stringNum = stringNumbers[i];
        let num = Number(stringNum);
        numArray.push(num);
    }

    // Sort the num array
    numArray.sort(function(a, b) {
        return a - b;
      });
    
    // Now we have sorted array, return the last value
    let lastValue = numArray[numArray.length - 1];
    let lastValueStr = lastValue.toString();
    return lastValueStr;
}

Utilities.createUID = function() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
}

module.exports = Utilities;