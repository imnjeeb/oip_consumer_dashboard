/**
 * Created by R10253 on 2/12/2018.
 */

const ctrl_link="/api/rpc";
var processingCommand=false;

function setAutcColorChange(tempIncrease) {
    var color='blue';
    if (tempIncrease) {
        color='red';
    }
    /* TODO */
    colorChanger(color);
}

$(function(){
    var body = {"method":"setLightStatus", "params":{"zone":"1","state":"off","value":"25"}};
    var onSwitcher=$('#onSwitcher').find('input[type=radio][name=OnOff]'),
        colorSwitcher=$('#colorSwitcher').find('input[type=radio][name=BlueWhite]'),
        poleKnob = $('#pole_knob'),
        autoSwitcher=$('#autoSwitcher').find('input[type=radio][name=AutoTemp]');

    /*onSwitcher.change(function(evt){});*/
    onSwitcher.on('click',function(evt){
        /** TODO */
        turnLight(this.value);
        console.log('switch', this.value);
        if (this.value=='on') {
            poleKnob.val(bMax).trigger('change');
        } else {
            poleKnob.val(bMin).trigger('change');
        }
    });

    colorSwitcher.on('click',function(evt){
        if (onSwitcher.val()=='off') {
            triggerOnOffSwitch('on');
        }
        /** TODO */
        colorChanger(this.value);
        if (poleKnob.val()==bMin)
            poleKnob.val(bMax).trigger('change');

    });

    autoSwitcher.on('click',function(evt){
        var isAuto=(this.value=='auto');
        disableSwitches(isAuto);
        setAutoStatus(isAuto);
    });

    var timeoutSubmit, second = 1.5*1000, bMin = 0, bMax = 100,
        submitDimmer = function(v) {
            var val = parseInt(v)/10*2;
            //if (val == 0) jsonBody.command = "off";
            //else if (val == 100) jsonBody.command = "on";
            brightnessChanger(val);
        },
        clearSubmitTimeout = function() {
            if (typeof timeoutSubmit == 'undefined') return;
            window.clearTimeout(timeoutSubmit);
        };
    var initSubmitTimeout = function(val) {
        timeoutSubmit = window.setTimeout(function() {
            submitDimmer(val);
        }, second);
    };

    var flagInitializeKnob = false;
    $(".dial").knob({
        fgColor:"#f39c12"
        , bgColor:"#EEEEEE"
        , thickness : .2
        , step: 10
        , displayPrevious: true
        , noScroll: true
        , release : function (value) {
            if (!flagInitializeKnob) {
                clearSubmitTimeout();
                initSubmitTimeout(value);
            }
        }
        , change : function (value) {
            /*normal case*/
            var val = parseInt(value/10)*10;
            /*if value remainder is more than 5, incline towards bigger number*/
            if (value%10 > 5) val = parseInt(value/10)*10+10;

            if (val == 0) triggerOnOffSwitch('off');
            else triggerOnOffSwitch('on');
        }}).css({display:'inline'});
    /*input #pole_knob */
    poleKnob.on("change paste keyup", function() {
        var value = parseInt($(this).val());
        if (!flagInitializeKnob) {
            clearSubmitTimeout();
            initSubmitTimeout(value);
        }
        if (value == 0) triggerOnOffSwitch('off');
        else triggerOnOffSwitch('on');
    });
    /*click brightness/dimmer*/
    $(document).on('click', '.pole-dimmer', function(evt) {
        evt.preventDefault();
        var id = $(this).attr('id');
        var val, val2;
        val = val2 = parseInt(poleKnob.val());
        if (id == 'incr_brightness') {
            if (val < bMax) {
                val+=10;
                val = parseInt(val/10)*10;
            }
        } else if (id == 'decr_brightness') {
            if (val > bMin) {
                if (val%10==0) {
                    val-=10;
                    val = parseInt(val/10)*10;
                } else {
                    val+=10;
                    val = parseInt(val/10)*10-10;
                }
            }
        }
        if (val !== val2) poleKnob.val(val).trigger('change');
    });
    /*eof control light intensity*/

    function triggerOnOffSwitch(state) {
        if (state)
            $('#onSwitcher').find('input[type=radio][name=OnOff][value='+state+']').prop("checked", true);
    }

    function disableSwitches(toDisable) {
        onSwitcher.attr('disabled', toDisable);
        colorSwitcher.attr('disabled', toDisable);
        poleKnob.attr('disabled', toDisable);
    }


});

/**
 * all api
 */
function turnLight(state) {
    if (processingCommand) return;
    processingCommand=true;
    switcher('1',state,'',function(d,o){
        if (d==200) {

        }
        processingCommand=false;
    })
}

function colorChanger(color) {
    if (processingCommand) return;
    processingCommand=true;
    var value = '255', // blue
        state='color';
    if (color=='white') {
        state='white';
        value='';
    } else if (color=="red") {
        value='175';
    }
    console.log('color ',state,value);
    switcher('1',state,value,function(d,o){
     if (d==200) {

     }
     processingCommand=false;
     })
}

function brightnessChanger(value) {
    if (processingCommand) return;
    processingCommand=true;
    if (value==20) value-=1;
    console.log('value',value);
    switcher('1','dim',value,function(d,o){
        if (d==200) {

        }
        processingCommand=false;
    })
}

function switcher(zone,state,value, callback) {
    var obj = {
        "method":"setLightStatus",
        "params":{
            "zone":"all",
            "state":"off"
        }
    };
    if (zone&&parseInt(zone)>0) {
        obj.params.zone=zone.toString();
    }
    if (state=='on'||state=='white') {
        obj.params.state=state;
    }
    if (state=='color'||state=='dim') {
        obj.params.state=state;
        if (value)
            obj.params.value=value.toString();
        else
            obj.params.value='0';
    }

    postApi(ctrl_link, obj, function(d){
        var resp = d.Data;
        callback(resp.statusCode,obj.params);
    })
}