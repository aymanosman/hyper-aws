"use strict";

var _ = require("lodash");
var aws = require("aws-sdk");
var table = require("text-table");

aws.config.region = "eu-west-1";
var ec2 = new aws.EC2;

var input = process.argv.slice(2);
var command = input.shift();

function handleError(err) {
    console.error(err);
}

if (module === require.main) {

    switch (command) {
        case "node":
            ec2.describeInstances().promise()
                .then(function(res) {
                    var instances = _.flatMap(res.Reservations, (r) => r.Instances);

                    function awsToNode(instance) {
                        /**
                     * description
                        | NAME ||
                        | ZONE ||
                        | MACHINE_TYPE ||
                        | INTERNAL_IP ||
                        | EXTERNAL_IP ||
                        | STATUS ||
                     *
                     */
                        function mkName() {
                            let ff = '';

                            let name = instance.InstanceId + ff;
                            return name;
                        }

                        return {
                            name: mkName(),
                            nodeType: instance.InstanceType,
                            internalIP: instance.PrivateIpAddress,
                            publicIP: instance.PublicIpAddress,
                            state: instance.State.Name
                        }
                    }

                    function printCollection(coll) {
                        let data = _.values(coll)
                        let rows = _.map(coll, (c) => _.values(awsToNode(c)))
                        let header = ["NAME", "TYPE", "INTERNAL_IP", "EXTERNAL_IP", "STATE"];
                        let output = table([header].concat(rows));
                        console.log(output);
                    }
                    printCollection(instances)
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
                "  status         SSS",
                "  status         SSS"
            ].join('\n'));
    }
}
