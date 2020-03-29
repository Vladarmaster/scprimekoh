// KOH Data
// Licensed under GPLv3
var fs = require('fs');
const CronJob = require('./node_modules/cron/lib/cron.js').CronJob;
var siaprime = require('siaprime.js');
var http = require('request');
var https = require('https');
var axios = require('axios');
var Path = require('path')
var os = require('os')

// Passing arguments
	const job = new CronJob('0 */10 * * * *', function() {
	openSettingsFile()
	console.log('\x1b[44m%s\x1b[0m', "*** ScPrime Network ***")
  console.log('\x1b[44m%s\x1b[0m', "***********************")
	console.log('\x1b[44m%s\x1b[0m', "*****  KOH Data  ******")
	console.log('\x1b[44m%s\x1b[0m', "*****           *******")
	console.log('\x1b[44m%s\x1b[0m', "*********   ***********")
	var datetime = new Date();
    console.log(datetime);
});

if (argument1 == "-debug" || argument1 == "--debug" || argument1 == "-d") {
    // Debug mode
    var debugMode = true
    var argument1 = process.argv[3]
    var argument2 = process.argv[4]
    var argument3 = process.argv[5]
    var argument4 = process.argv[6]
    var argument5 = process.argv[7]
    var argument6 = process.argv[8]
    var argument7 = process.argv[9]
} else {
    // Normal mode
    var debugMode = false
    var argument2 = process.argv[3]
    var argument3 = process.argv[4]
    var argument4 = process.argv[5]
    var argument5 = process.argv[6]
    var argument6 = process.argv[7]
    var argument7 = process.argv[8]
}

console.log()
if (debugMode == false) {

} else {
    console.log('\x1b[44m%s\x1b[0m', "*** Debug mode *** Vl@darmaster ***")
}
console.log()

// Directing to the proper function according to the user arguments
if (argument1 == null) {
    openSettingsFile()
}

function openSettingsFile() {
    // First, updating the settings file or creating a new one if it is the first syncing
    if (debugMode == true) {console.log("// DEBUG - Opening the settings file")}

    var timestamp = Date.now() // Timestamp

    // Opening settings file
    fs.readFile('addit/settings.json', 'utf8', function (err, data) { if (!err) {
        if (debugMode == true) {console.log("// DEBUG - Found settings file, updating it")}

        var settings = JSON.parse(data)
        settings.lastsync = timestamp
        geolocUser(settings)
    } else {
        // Initialize a settings file here
        if (debugMode == true) {console.log("// DEBUG - No settings file found. Creating a new one")}
        settings = {
            userLon: null,
            userLat: null,
            lastsync: timestamp,
            listMode: "disable"
        }
        geolocUser(settings)
    }});
}

function geolocUser(settings) {

    // but all the json files need to be compatible with Reviser-GUI, which uses the user geoloc for showing the map
    var ipquery = "http://ip-api.com/json/"

    axios.get(ipquery).then(response => {
        var ipAPI = response.data
        settings.userLon = parseFloat(ipAPI.longitude)
        settings.userLat = parseFloat(ipAPI.latitude)
        fs.writeFileSync('addit/settings.json', JSON.stringify(settings))
        scpstatsGeolocFile()

    }).catch(error => {
        console.log("failed")
        console.log(error)
        fs.writeFileSync('addit/settings.json', JSON.stringify(settings))
        scpstatsGeolocFile()
    })
}

function scpstatsGeolocFile() {
    // SCPStats JSON geolocation. If the file can't be downloaded, the local copy is used instead
    if (debugMode == true) {console.log("// DEBUG - Getting the SCPStats geolocation/scores API")}

    // Removing SSL authorization for this specific API call
    var agent = new https.Agent({
        rejectUnauthorized: false
    });

    axios.get('', { httpsAgent: agent }).then(response => {
        var scpGeoloc = response.data
        console.log("Downloaded " + scpGeoloc.length + " hosts geolocation and score from SCPrimeStats.info");

        // Saving the file
        fs.writeFileSync('addit/hosts_geoloc.json', JSON.stringify(scpGeoloc))

        scpFarmsFile(scpGeoloc)
    }).catch(error => {
        if (debugMode == true) {console.log("// DEBUG - Could not download SCPrimeStats API. Reading local file instead. Error: \n" + error)}
        fs.readFile('addit/hosts_geoloc.json', 'utf8', function (err, data) { if (!err) {
            scpGeoloc = JSON.parse(data);
            console.log("")
            scpFarmsFile(scpGeoloc)
        } else {
            console.log("ERROR - The software can't find locally, or download, necessary databases.")
        }});
    });
}

function scpFarmsFile(scpGeoloc) {
    // Scprime JSON geolocation. If the file can't be downloaded, the local copy is used instead
    if (debugMode == true) {console.log("// DEBUG - Getting the SCPrimeStatistic farms API")}

    axios.get('https://').then(response => {
        var scpGeolocFarms = response.data
        console.log("Downloaded data from " + scpGeolocFarms.length + " farms from SCPrimeStatistic.info");

        // Saving the file
        fs.writeFileSync('addit/farms_definition.json', JSON.stringify(scpFarms))

        scpHosts(scpGeoloc, scpFarms)
    }).catch(error => {
        if (debugMode == true) {console.log("// DEBUG - Could not download SCPrimeStatistic API. Reading local file instead. Error: \n" + error)}
        fs.readFile('addit/farms_definition.json', 'utf8', function (err, data) { if (!err) {
            scpFarms = JSON.parse(data);
            console.log("")
            scpHosts(scpGeoloc, scpFarms)
        } else {
            console.log("ERROR - The software can't find locally, or download, necessary databases. ")
        }});
    });
}

function scpHosts() {
    // Requesting active hosts with an API call:
    console.log("Collect...")
    siaprime.connect('localhost:4280')
    .then((siad) => {siad.call('/hostdb/all')
        .then((hosts) => {
            var allHosts = hosts.hosts
            // Filtering only the active and accepting contracts. If I was using the /hostdb/active, it would show less hosts after applying a filter
            var active = []
            for (var i = 0; i < allHosts.length; i++) {
                if (allHosts[i].scanhistory != null) { // It has already one scan
                    if (allHosts[i].scanhistory[allHosts[i].scanhistory.length-1].success == true
                        && allHosts[i].acceptingcontracts == true) {
                        active.push(allHosts[i])
                    }
                }
            }
            var hostNum = 0
            if (debugMode == true) {console.log("// DEBUG - Iterating hostdb/hosts/ SCPrime calls for each host")}
            hostsScore(scpGeoloc, scpFarms, active, hostNum)
        })
        .catch((err) => {
            console.log("Error retrieving data from SCPrime. Is SCPrime working, synced and connected to internet? Try this script again after restarting Scprime.")
            if (debugMode == true) {console.log("// DEBUG - Error: \n" + err)}
            console.log()
        })
    })
    .catch((err) => {
        console.log("Error connecting to SCPrime. Start the SCPrime app (either daemon or UI) and try again")
        console.log()
        if (debugMode == true) {console.log("// DEBUG - Error: \n" + err)}
    })
}


function hostsScore(scpGeoloc, scpFarms, active, hostNum) {
    // Iterates on each host to collect from SCPrime the score of the host
    if (hostNum < active.length) {
        siaprime.connect('localhost:4280')
        .then((siad) => {siad.call('/hostdb/hosts/' + active[hostNum].publickeystring)
            .then((host) => {
                var score = host.scorebreakdown.conversionrate
                active[hostNum].score = score
                hostNum++
                process.stdout.clearLine();  // clear current text
                process.stdout.cursorTo(0);  // move cursor to beginning of line
                process.stdout.write("(" + hostNum + "/" + active.length + ") - " + active[hostNum-1].netaddress)
                hostsScore(scpGeoloc, scpFarms, active, hostNum)
            })
            .catch((err) => {
                console.log("Error retrieving data from SCPrime. Is SCprime working, synced and connected to internet? Try this script again after restarting SCPrime.")
                if (debugMode == true) {console.log("// DEBUG - Error on host " + active[hostNum].publickeystring + ": \n" + err)}
                console.log()
            })
        })
        .catch((err) => {
            console.log("Error connecting to SCPrime. Start the SCPrime app (either daemon or UI) and try again")
            if (debugMode == true) {console.log("// DEBUG - Error on host " + active[hostNum].publickeystring + ": \n" + err)}
            console.log()
        })

    } else {
        // We are done. Move to the next step
        process.stdout.clearLine();  // clear current text
        console.log()
        if (debugMode == true) {console.log("// DEBUG - Host data collection done")}



        // Arranges the hosts array by score
        function compare(a,b) {
            if (a.score < b.score)
                return -1;
            if (a.score > b.score)
                return 1;
            return 0;
        }
        active.sort(compare);

        hostsProcessing(scpGeoloc, scpFarms, active)
    }
}

function hostsProcessing(scpGeoloc, scpFarms, hostdb) {
    if (debugMode == true) {console.log("// DEBUG - Starting hostsProcessing() function")}
    // Assigns IPs to the hostdb and determines the hosts that need additional geolocation
    hostsToGeoloc = [] // Entries numbers that need to be geolocated locally
    for (var i = 0; i < hostdb.length; i++) { // For each host
        var matchBool = false
        for (var j = 0; j < scpGeoloc.length; j++) { // For each geolocation in list
            if (hostdb[i].publickeystring == scpGeoloc[j].pubkey) {
                // Match, update hostdb entry
                matchBool = true
                hostdb[i].lon = scpGeoloc[j].lon
                hostdb[i].lat = scpGeoloc[j].lat
                hostdb[i].countryName = scpGeoloc[j].countryName
                hostdb[i].countryCode = scpGeoloc[j].countryCode
                hostdb[i].scprimeScore = scpGeoloc[j].scprimeScore

                // We update the geoloc file with the pubkey in the non-hex format, as it will be lated needed for the contracts identification
                scpGeoloc[j].pubkey2 = hostdb[i].publickey.key
            }
        }
        if (matchBool == false) {
            // If no match, add to the list
            hostsToGeoloc.push(i)

            hostdb[i].scprimeScore = 0 // Adding a 0 in the score
        }
    }

    console.log("Scaning providers... " + hostsToGeoloc.length + "\n")
    if (hostsToGeoloc.length > 0) {
        var i = 0
        requestIP(scpFarms, hostdb, hostsToGeoloc, i, scpGeoloc)
    } else {
        // No additional host to geolocate, save and proceed to next step
        if (debugMode == true) {console.log("// DEBUG - No additional host to geolocate. Moving to compareOldDb()")}
        compareOldDb(hostdb, scpFarms, scpGeoloc)
    }
}


function requestIP(scpFarms, hostdb, hostsToGeoloc, i, scpGeoloc) {

    // Triming the ":port" from the host IP
    var hostip = hostdb[hostsToGeoloc[i]].netaddress
    var s = hostip.search(":")
    var totrim = hostip.length - s
    trimedip = hostip.slice(0, -totrim)

    // Requesting the geolocation of the host
    var ipquery = "http://ip-api.com/json/" + trimedip
    axios.get(ipquery).then(response => {
        var ipAPI = response.data
        var lat = parseFloat(ipAPI.latitude)
        var lon = parseFloat(ipAPI.longitude)
        process.stdout.clearLine();  // clear current text
        process.stdout.cursorTo(0);  // move cursor to beginning of line
        process.stdout.write("(" + (i+1) + "/" + hostsToGeoloc.length + ") - " + hostip)

        hostdb[hostsToGeoloc[i]].lon = lon
        hostdb[hostsToGeoloc[i]].lat = lat
        hostdb[hostsToGeoloc[i]].as = ipAPI.as // Also adding the ISP
        hostdb[hostsToGeoloc[i]].countryName = ipAPI.country // Also adding the ISP
        hostdb[hostsToGeoloc[i]].countryCode = ipAPI.countryCode // Also adding the ISP
        nextIP(scpFarms, hostdb, hostsToGeoloc, i, scpGeoloc)

    }).catch(error => {
        // On failed IP request, move to the next IP
        console.log(hostip + " - Failed")
        if (debugMode == true) {console.log("// DEBUG - Error (non-critical): \n" + error)}
        nextIP(scpFarms, hostdb, hostsToGeoloc, i, scpGeoloc)
    })
}

function nextIP(scpFarms, hostdb, hostsToGeoloc, i, scpGeoloc) {
    setTimeout(function(){ // 500ms cooldown, to avoid being banned by ip-api.com
        i++
        if (i < hostsToGeoloc.length) {
            requestIP(scpFarms, hostdb, hostsToGeoloc, i, scpGeoloc)
        } else {
            console.log("\nProviders List done!\n")

            compareOldDb(hostdb, scpFarms, scpGeoloc)
        }
    }, 1300);
}

function compareOldDb(hostdb, scpFarms, scpGeoloc) {
    // Opening the hosts file to re-add the "onlist" value (hosts added to the Filter)
    if (debugMode == true) {console.log("// DEBUG - compareOldDb(): reading adon.json and updating it")}
    fs.readFile('databases/adon.json', 'utf8', function (err, data) { if (!err) {
        oldHosts = JSON.parse(data);

        for (var i = 0; i < hostdb.length; i++) {
            for (var j = 0; j < oldHosts.length; j++) {
                if (hostdb[i].publickey.key == oldHosts[j].publickey.key) { // Match of hosts
                    if (oldHosts[j].onList == true) {
                        // Add the boolean to the new hostdb
                        hostdb[i].onList = true
                    }
                }
            }
        }

        // Saving the file
        fs.writeFileSync('databases/adon.json', JSON.stringify(hostdb))

        // Next
    scpContracts(scpFarms, scpGeoloc)

    } else {
        // If no file was found, it is the first scanning: just proceed
        if (debugMode == true) {console.log("// DEBUG - No previous adon.json file. Creating new")}
        fs.writeFileSync('databases/adon.json', JSON.stringify(hostdb))
        scpContracts(scpFarms, scpGeoloc)
    }});
}


function scpContracts(scpFarms, scpGeoloc) {
    // Requesting the contracts list with an API call:
    console.log("Gathering additional informations...")
    siaprime.connect('localhost:4280')
    .then((siad) => {siad.call('/renter/contracts')
        .then((contractsAPI) => {
            if (debugMode == true) {console.log("// DEBUG - /renter/contracts call succedded")}
            var contracts = contractsAPI.contracts

            if (contracts.length == 0) {
                contracts = []
                fs.writeFileSync('databases/contracts.json', JSON.stringify(contracts))
                farms = []
                fs.writeFileSync('addit/farms.json', JSON.stringify(farms))

                console.log("Initial sync done: You don't have currently any active contract. Set an allowance first in SCPrime")
                console.log()
            } else {
                // Considering only the contracts good for upload and good for renew, this is, active
                // (Scprime returns active and inactive all together)
                var activeContracts = []
                for (var i = 0; i < contracts.length; i++) {
                    if (contracts[i].goodforupload == false && contracts[i].goodforrenew == false) {
                        // Inactive contract, do not consider further
                    } else {
                        activeContracts.push(contracts[i])
                    }
                }

                console.log("Checking IPs of " + activeContracts.length + " active contracts")
                contractsIpAssign(scpFarms, activeContracts, scpGeoloc)
            }

        })
        .catch((err) => {
            // In some circumstances, abscense of contracts can make this call to fail
            contracts = []
            fs.writeFileSync('addit/contracts.json', JSON.stringify(contracts))
            farms = []
            fs.writeFileSync('addit/farms.json', JSON.stringify(farms))

            if (debugMode == true) {
                console.log("// DEBUG - Error retrieving data from ScPrime. Is ScPrime working, synced and connected to internet?")
                console.log("// DEBUG - Error: " + err)
            }
            console.log("Scan done!")
            console.log()
        })
    })
    .catch((err) => {
        console.log("Error connecting to Scprime. Start the Scprme app (either daemon or UI) and try again")
        if (debugMode == true) {console.log("// DEBUG - Error: " + err)}
        console.log()
    })
}


function contractsIpAssign(scpFarms, contracts, scpGeoloc) {
    // Assigns IPs to the contracts and determines the hosts that need additional geolocation
    if (debugMode == true) {console.log("// DEBUG - contractsIPAssign(): adding geolocation/score data to hosts")}

    contractsToGeoloc = [] // Entries numbers that need to be geolocated locally
    for (var i = 0; i < contracts.length; i++) { // For each contract
        var matchBool = false
        for (var j = 0; j < scpGeoloc.length; j++) { // For each geolocation in list
            if (contracts[i].hostpublickey.key == scpGeoloc[j].pubkey2) {
                // Match, update hostdb entry
                matchBool = true
                contracts[i].lon = scpGeoloc[j].lon
                contracts[i].lat = scpGeoloc[j].lat
                contracts[i].as = scpGeoloc[j].as
                contracts[i].countryName = scpGeoloc[j].countryName
                contracts[i].countryCode = scpGeoloc[j].countryCode
                contracts[i].scprimeScore = scpGeoloc[j].scprimeScore
            }
        }
        if (matchBool == false) {
            // If no match, add to the list
            contractsToGeoloc.push(i)

            contracts[i].scprimeScore = 0 // 0 score, as it is not on the database
        }
    }

    console.log("Number of additional contracts to be geolocated: " + contractsToGeoloc.length + "\n")
    if (contractsToGeoloc.length > 0) {
        var i = 0
        requestContractIP(scpFarms, contracts, contractsToGeoloc, i)
    } else {
        // No additional host to geolocate, save and proceed to next step
        if (debugMode == true) {console.log("// DEBUG - No geolocation necessary, saving contracts.json")}
        fs.writeFileSync('addit/contracts.json', JSON.stringify(contracts))
        processHosts(scpFarms, contracts)
    }
}


function requestContractIP(scpFarms, contracts, contractsToGeoloc, i) {

    // Triming the ":port" from the host IP
    var hostip = contracts[contractsToGeoloc[i]].netaddress
    var s = hostip.search(":")
    var totrim = hostip.length - s
    trimedip = hostip.slice(0, -totrim)

    // Requesting the geolocation of the host
    var ipquery = "http://ip-api.com/json/" + trimedip
    axios.get(ipquery).then(response => {
        var ipAPI = response.data

        var lat = parseFloat(ipAPI.latitude)
        var lon = parseFloat(ipAPI.longitude)
        process.stdout.clearLine();  // clear current text
        process.stdout.cursorTo(0);  // move cursor to beginning of line
        process.stdout.write("(" + (i+1) + "/" + contractsToGeoloc.length + ") - " + hostip)

        contracts[contractsToGeoloc[i]].lon = lon
        contracts[contractsToGeoloc[i]].lat = lat
        contracts[contractsToGeoloc[i]].as = ipAPI.as // Also adding the ISP
        contracts[contractsToGeoloc[i]].countryName = ipAPI.country // Also adding the ISP
        contracts[contractsToGeoloc[i]].countryCode = ipAPI.countryCode // Also adding the ISP
        nextContractIP(scpFarms, contracts, contractsToGeoloc, i)

    }).catch(error => {
        // On failed IP request, move to the next IP
        console.log(hostip + " - Failed")
        if (debugMode == true) {console.log("// DEBUG - Error: " + error)}
        nextContractIP(scpFarms, contracts, contractsToGeoloc, i)
    })
}
job.start();
