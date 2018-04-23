	// LINE AND BARS CHARTS
    const ts_link="/api/value.ts?keys=humidity%2Ctemperature%2Ctemp%2Cmovement";
    const params="&interval=2000&limit=30&agg=NONE";

    var arrowTemp = $('i#temp-arrow');
    var latestTemp = $('#info-temperature');
    var latestHumid = $('#info-humidity');

    // read by controller.js auto function
    var isAutoTriggered=false;
    var intervalRequest = 2500;

$(function () {

  var sensorTsData={};
  var chart,
      categories = [],
      serie1 = [],
      serie2 = [];

  function loadTsData(cb) {
    var startTs=moment().subtract(3, 'days').valueOf(),
        endTs=moment().valueOf();
    var ts_url=getTsLink()+params+"&startTs="+startTs+"&endTs="+endTs;
    //console.log('ts_url',ts_url);
    getApi(ts_url, function(d){
      var resp = d.Data;

      sensorTsData=resp.Data;
      cb(resp.statusCode==200);
    });
  }

  var singleDataLoaded=false;
  function loadSingleData(cb) {
    getApi(getTsLink(), function(d){
      singleDataLoaded=true;
      var resp = d.Data;
      cb(resp.statusCode==200,resp.Data);
    });
  }

  function generateNumber(min, max) {
    min = typeof min !== 'undefined' ? min : 1;
    max = typeof max !== 'undefined' ? max : 100;
    
    return Math.floor((Math.random() * max) + min);
  }

  $(document).ready(function() {
    var chopt={
      chart: {
        renderTo: 'importantchart',
        type: 'column',
        backgroundColor: 'transparent',
        height: 140,
        marginLeft: 3,
        marginRight: 3,
        marginBottom: 0,
        marginTop: 0
      },
      title: {
        text: ''
      },
      xAxis: {
        lineWidth: 0,
        tickWidth: 0,
        labels: {
          enabled: false
        },
        categories: categories
      },
      yAxis: {
        labels: {
          enabled: false
        },
        gridLineWidth: 0,
        title: {
          text: null
        }
      },
      series: [{
        name: 'Temperature',
        data: serie1
      }, {
        name: 'Humidity',
        color: '#fff',
        type: 'line',
        data: serie2
      }],
      credits: {
        enabled: false
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        column: {
          borderWidth: 0,
          color: '#b2c831',
          shadow: false
        },
        line: {
          marker: {
            enabled: false
          },
          lineWidth: 3
        }
      },
      tooltip: {
        enabled: false
      }
    };

    loadTsData(function(d){
      if (d) {
        var tem = ("temp" in sensorTsData)?sensorTsData.temp:[],
            hum = ("humidity" in sensorTsData)?sensorTsData.humidity:[],
            mov = ("movement" in sensorTsData)?sensorTsData.movement:[];

        if (tem.length>0) {
          categories=[];
          serie1=[];
          tem.forEach(function(val){
            chopt.xAxis.categories.push(val.ts);
            serie1.push(parseFloat(val.value));
          });
          setTempInfo(tem[(tem.length-1)].value);
          chopt.series[1].data=serie1;
        }
        if (hum.length>0) {
          serie2=[];
          hum.forEach(function(val){
            serie2.push(parseInt(val.value));
          });
          setHumInfo(hum[(hum.length-1)].value);
          chopt.series[0].data=serie2;
        }
      }
      chart = new Highcharts.Chart(chopt);

      setInterval(function() {
        if (!singleDataLoaded) {
          loadSingleData(function(status,d){
            if (status) {
              var hum = parseInt(d.humidity[0].value),
                  prev_hum = parseInt(latestHumid.text()) || 0;
              var temp = parseFloat(d.temp[0].value),
                  prev_temp = parseFloat(latestTemp.text()) || 0.0;

              compareTempVal(prev_temp,temp);

              chart.series[0].addPoint(hum, true, true);
              chart.series[1].addPoint(temp, true, true);

              setTempInfo(temp);
              setHumInfo(hum);
            }
            singleDataLoaded=false;
          });
        }
      }, intervalRequest);//2500
    });

  });
  
});

    function setTempInfo(val) {
      latestTemp.html(val+' °C');
    }

    function setHumInfo(val) {
      latestHumid.html(val+' %');
    }

    function compareTempVal(prev,next) {
      prev=parseFloat(prev) || 0.0;
      next=parseFloat(next) || 0.0;

      var temperatureIncrease=false;

      if (prev>next) {
        if (!arrowTemp.hasClass('fa-caret-down'))
          arrowTemp.removeClass().addClass('fa fa-caret-down');
      } else if (prev<next) {
        temperatureIncrease=true;
        if (!arrowTemp.hasClass('fa-caret-up'))
          arrowTemp.removeClass().addClass('fa fa-caret-up');
      } else {
        if (!arrowTemp.hasClass('fa-caret-right'))
          arrowTemp.removeClass().addClass('fa fa-caret-right');
      }

      if (isAutoTriggered) {
        setAutcColorChange(temperatureIncrease);
      }
    }

    function getTsLink() {
      return ts_link;
    }

    function setAutoStatus(state) {
      return isAutoTriggered=state;
    }