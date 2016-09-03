"use strict";

var util = require("util");
var _ = require("lodash");
var aws = require("aws-sdk");
var table = require("text-table");
var args = require("minimist")(process.argv.slice(2));

if (args.region) {
    aws.config.region = args.region;
}
if (!aws.config.region) {
    console.log("Error: AWS_REGION or --region must be provided");
    process.exit(1);
}
var ec2 = new aws.EC2;

function handleError(err) {
    console.error(err);
}

if (module === require.main) {

    var command = args._[0]
    switch (command) {
        case "node":
            let options = {};
            if (args.filter) {
                let filter = mkFilter(args.filter);
                options.Filters = filter
            }
            ec2.describeInstances(options).promise()
                .then(function(res) {
                    var instances = _.flatMap(res.Reservations, (r) => r.Instances);
                    if (instances && instances.length > 0) {
                        printCollection(instances)
                    } else {
                        console.log("Listed 0 items");
                    }
                }).catch(handleError);

            break;

        case "status":
            ec2.describeInstances().promise()
                .then(function(res) {
                    var id = res.Reservations[0].Instances[0].InstanceId;
                    return ec2.describeInstanceStatus({
                        InstanceIds: [id]
                    }).promise();
                }).then(function(res) {
                    var statuses = res.InstanceStatuses[0]
                    console.log('RRR', statuses);
                }).catch(handleError);
            break;
        case 'sss':

            break;

        default:
            console.log([
                "Usage:",
                "",
                "  node           SSS",
                "  status         SSS"
            ].join('\n'));
    }
}

/**
 * Support filtering by tag
 *
 */
function mkFilter(filter) {
    let parts = filter.split("=");
    let key = parts[0];
    let value = parts[1];
    return [{
        Name: "tag:" + key,
        Values: [value]
    }];
}

function awsToNode(instance) {
    function mkName() {
        let ff = '';

        let nameTag = _.find(instance.Tags, ["Key",
            "Name"
        ])
        if (nameTag) {
            ff = util.format("(%s)", nameTag.Value)
        }
        return instance.InstanceId + ff;
    }

    return {
        name: mkName(),
        nodeType: instance.InstanceType,
        internalIP: instance.PrivateIpAddress || "",
        publicIP: instance.PublicIpAddress || "",
        state: instance.State.Name
    }
}

function printCollection(coll) {
    let data = _.values(coll)
    let rows = _.map(coll, (c) => _.values(awsToNode(c)))
    let header = ["NAME", "TYPE", "INTERNAL_IP", "EXTERNAL_IP", "STATE"];
    let tableData = [header].concat(rows);
    let output = table(tableData);
    console.log(output);
}
