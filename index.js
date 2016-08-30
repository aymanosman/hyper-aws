"use strict";

var aws = require("aws-sdk");

aws.config.region = "eu-west-1";
var ec2 = new aws.EC2;

var input = process.argv.slice(2);
var command = input.shift();

if (module === require.main) {

    switch (command) {
        case 'status':
            console.log('wwwwhat??');
            ec2.describeInstances().promise()
            .then(function(res) {
                console.log('what??');
                var id = res.Reservations[0].Instances[0].InstanceId;
                return ec2.describeInstanceStatus({InstanceIds: [id]}).promise();
            }).then(function(res) {
                var statuses = res.InstanceStatuses[0]
                console.log('RRR', statuses);
            }).catch(function(err) {
                console.error(err);
            });
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
