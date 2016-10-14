"use strict";

var util = require("util");
var _ = require("lodash");
var aws = require("aws-sdk");
var table = require("text-table");
var args = require("minimist")(process.argv.slice(2));

/**
 * Design
 *
 * sort, filter, convert, project
 *
 */

if (module === require.main) {
    var options = {};

    var command = args._[0]
    switch (command) {
        case "node":
            set_config_exn();
            handle_node(args);
            break;

        case "metric":
            set_config_exn();
            handle_metric(args);
            break;

        case "stat":
            set_config_exn();
            handle_stat(args);
            break;

        default:
            console.log([
                "Usage:",
                "",
                "  node           List instances (--filter=env=prod)",
                "  metric         List metrics (--namespace=AWS/EC2, --sort=MetricName)",
                "  stat           List stats (--namespace=AWS/EC2, --metricname=Volxxx)"
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

function printInstances(coll) {
    function getName(instance) {
        let ff = '';
        let nameTag = _.find(instance.Tags, ["Key", "Name"]);
        if (nameTag) {
            ff = util.format("(%s)", nameTag.Value)
        }
        return instance.InstanceId + ff;
    }

    function getState(instance) {
        return instance.State.Name
    }

    function getTags(instance) {
        return _(instance.Tags).map((d) => [d.Key, "=", d.Value].join(""))
            .value().join(",") || "<none>";
    }

    let mappings = [
        ["name", getName],
        ["type", "InstanceType"],
        ["internal_ip", "PrivateIpAddress"],
        ["public_ip", "PublicIpAddress"],
        ["tags", getTags],
        ["state", getState]
    ];

    function awsToNode(instance) {
        var obj = {};

        _.forEach(mappings, function(mapping) {
            let [x, y] = mapping;
            if (typeof y === "function") {
                obj[x] = y(instance);
            } else {
                obj[x] = instance[y];
            }
        });

        return obj;
    }

    let data = _.values(coll)
        // WARNING: will blow up if any value is undefined
    let rows = _.map(coll, (c) => _.values(awsToNode(c)))
        // let header = ["NAME", "TYPE", "INTERNAL_IP", "EXTERNAL_IP", "STATE"];
    let header = _.map(mappings, (m) => m[0].toUpperCase());
    let tableData = [header].concat(rows);
    let output = table(tableData);
    console.log(output);
}

function printMetrics(coll) {

    function getRow(metric) {
        return {
            namespace: metric.Namespace,
            metricname: metric.MetricName,
            dimensions: formatDimensions(metric.Dimensions) || "<none>"
        }
    }

    if (coll && coll.length > 0) {
        let data = _.values(coll);
        let rows = _.map(coll, (x) => _.values(getRow(x)))
        let header = ["NAMESPACE", "METRICNAME", "DIMENSIONS"];
        let tableData = [header].concat(rows);
        let output = table(tableData);
        console.log(output);
        console.log("Listed %s items", coll.length);
    } else {
        console.log("Listed 0 items");
    }
}

function set_config_exn() {
    set_region_exn();
    set_creds_exn();
}

function set_region_exn() {
    if (args.region) {
        // TODO: handle array, for overriding
        aws.config.region = args.region;
    } else {
        exit("--region must be provided (will not assume default region)")
    }
}

function set_creds_exn() {
    if (args.profile) {
        aws.config.credentials = new aws.SharedIniFileCredentials({
            profile: args.profile
        });
    } else {
        exit("--profile must be provided (will not assume default profile)")
    }
}

/**
 * Command handlers
 *
 */
function handle_node(args) {
    if (args.filter) {
        let filter = mkFilter(args.filter);
        options.Filters = filter
    }

    var ec2 = new aws.EC2;
    ec2.describeInstances(options).promise()
        .then(function(res) {
            var instances = _.flatMap(res.Reservations, (r) =>
                r.Instances);
            if (instances && instances.length > 0) {
                printInstances(instances)
            } else {
                console.log("Listed 0 items");
            }
        }).catch(handleError);
}

function handle_metric(args) {

    var namespace;
    if (args.namespace) {
        namespace = args.namespace
    }
    let cloudwatch = new aws.CloudWatch;
    cloudwatch.listMetrics({
            Namespace: namespace
        }).promise()
        .then(function(res) {
            var metrics;
            if (args.sort) {
                metrics = sortBy(res.Metrics, args.sort);
            } else {
                metrics = res.Metrics;
            }
            printMetrics(metrics);
        }).catch(handleError);
}

function handle_stat(args) {
    let _5_MINS = 1000 * 60 * 5;
    let options = {
        Statistics: ["Average", "Sum", "SampleCount", "Minimum", "Maximum"],
        Period: 60,
        StartTime: (new Date((new Date).getTime() - _5_MINS)).toISOString(),
        EndTime: (new Date).toISOString()
    };

    require_arg_exn("namespace", "Namespace", args.namespace, options);
    require_arg_exn("name", "MetricName", args.name, options);
    require_arg_exn("dimensions", "Dimensions", parseDimensions(args.dimensions), options);

    let cloudwatch = new aws.CloudWatch;
    cloudwatch.getMetricStatistics(options).promise()
        .then(function(res) {
            console.log("RRR", res);
        }).catch(handleError);
}

function sortBy(coll, field) {
    // Convert field
    var field2;
    switch (field) {
        case 'name':
            field2 = "MetricName";
            break;
        default:
            field2 = "";
    }

    return _.sortBy(coll, field2);
}

function formatDimensions(dimensions) {
    return _(dimensions).map((d) => [d.Name, "=", d.Value].join(""))
        .value().join(",");
}

/**
 * Error handling
 *
 */
function handleError(err) {
    console.error(err);
}

function exit(message) {
    console.log("Error: " + message);
    process.exit(1);
}

/**
 * Misc
 *
 */
function require_arg_exn(arg_name, awsName, arg, options) {
    if (arg) {
        options[awsName] = arg;
    } else {
        exit(["--", arg_name, " required"].join(""))
    }
}

function parseDimensions(dimensions) {
    return [{Name: "VolumeId", Value: "vol-f2378846"}];
}
