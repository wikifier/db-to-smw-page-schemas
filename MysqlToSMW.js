var mysql = require('mysql');
var builder = require('xmlbuilder');
var bot = require('./nodemw/lib/bot').bot;


var idKeys = true; // set to true for special behaviour if fields of the format _id are foreign keys to other tables

require('./local.js');

var smap = {'varchar(255)': 'String'
  , 'int(11)' : 'Number'
  , 'int(3)' : 'Number'
  , 'blob' : 'Text'
  , 'tinyint(1)' : 'Boolean'
  , 'date' : 'Date'
  , 'datetime' : 'Date'
  , 'float' : 'Number'
};
var schemas = {};
var wikibot;

function getConnection() {
  return mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : GLOBAL.mysqlPassword
  });
}

var connection = getConnection();
var wiki = getWiki();
var tables = [];

function getWiki() {
  wikibot = new bot('wikiConfig.js');

  wikibot.logIn(function() {
  processTables();
  });
}

function processTables() {
  var query = connection.query('use ' + GLOBAL.mysqlDB);
  query.on('error', function(err) {
      console.log(err);
      throw err;
  })

  query = connection.query('show tables');

  query.on('error', function(err) {
      console.log(err);
      throw err;
  }).on('result', function(row) {
    tables.push(row['Tables_in_' + GLOBAL.mysqlDB]); // FIXME: this seems hokey
  }).on('end', function() { 
    processSchemas(tables);
  });
}

function processSchemas(tables) {
  for (var i = 0; i < tables.length; i++) {
    getTableDesc(tables[i]);
  }
}

function getTableDesc(table) {
  connection.query('desc ' + table, function(err, rows, fields) {
    var extra = "[[Category:Generated classes]]\n";
    var schema = smwName(table);
    var curSchema = builder.create('PageSchema');
    var form = curSchema.ele('semanticforms_Form', {'name': schema});
    var curTemplate = curSchema.ele('Template', {'name':schema});
    schemas[table] = curTemplate;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var rtype = row['Type'];
      var rfield = row['Field'];
      var isId = rfield.match(/_id$/);
      var rel = smwName(rfield.replace(/_id$/, ''));
      if (isId && idKeys) {
	extra += '[[Has relationship::Category:' + rel  + "]]\n";
      }
      var ptype, allowed = '';
      if (rtype.indexOf('enum(') == 0) {
        var e = rtype;
        ptype = 'Page';
        e = e.replace(/^enum./, '').replace(/.$/, '');
        allowed = e.split(',');
      } else {
        ptype = popSMW(rfield, rtype);
      }
      var propname = smwName(row['Field']);
      var field = curTemplate.ele('Field', {name: propname})
        .ele("Label", propname)
        .up();
        var formInput = field.ele("semanticforms_FormInput");
        if (isId && idKeys) {
	  formInput.ele("InputType", "combobox");
	  formInput.ele("Parameter", {name: 'values from category'}, rel);
	}
       var prop = field.ele('semanticmediawiki_Property', {name: propname });
       prop.ele('Type', ptype);
       if (allowed) {
         for (var a = 0; a < allowed.length; a++) {
           var s = allowed[a].replace(/^'/, '').replace(/'$/, '').replace(/\\/, '');
           prop.ele('AllowedValue', s);
         }
      }
    }
    submitSchema(table, curTemplate, extra);
  });
}

var submittedSchemas = 0;
function submitSchema(table, schema, extra) {
  table = 'Category:' + smwName(table);
  var stext = schema.end({pretty: true}).replace('<?xml version="1.0"?>', '');
console.log(stext);
        
  wikibot.edit(table, stext + "\n" + extra, "imported from mysql", finishSchema);
console.log("will edit " + table);

  if (++submittedSchemas == tables.length) {
    endConnection(connection);
  }
}

function finishSchema() {
        console.log(arguments);
        // TODO: connect with nice PageSchemas api.php function
        //  http://wiki/mw/index.php?title=Category:Table cat&action=generatepages
}

function smwName(s) {
  var ret = s.replace(/_/g, " ");
  ret = ret.charAt(0).toUpperCase() + ret.slice(1);
  return ret;
}

/* Map a db type to an SMW type. Uses Page if it ends in _id.  */

function popSMW(field, type) {
  smwtype = smap[type];
  if (!smwtype) {
    if (type.indexOf("enum(") == 0) {
      smwtype = type;
    } else {
      throw 'Missing ' + type + ' from ' + field;
    }
  }
  if (field.match(/_id$/)) {
    smwtype = "Page";
  }
  
  return smwtype;
}

function endConnection(connection) {
  connection.end(function(err) {
  });
}

