window.closestByClass = function (el, clazz) {
        // Traverse the DOM up with a while loop
        while (!el.classList.contains(clazz)) {

            
            // Increment the loop to the parent node
            el = el.parentNode;
            if (!el || el === document.body) {
                return null;
            }
        }
        // At this point, the while loop has stopped and `el` represents the element that has
        // the class you specified in the second parameter of the function `clazz`

        // Then return the matched element
        return el;
    }

function InitUmbracoForm(formId) {

        var data = {
            contourFieldValues: undefined,
            recordValues: JSON.parse(document.querySelector("#values_" + formId).value),
            fsConditions: JSON.parse(document.querySelector("#fsConditions_" + formId).value),
            fieldConditions: JSON.parse(document.querySelector("#fieldConditions_" + formId).value),
            form: document.querySelector("#umbraco_form_" + formId + " form") || document.querySelector("#contour_form_" + formId + " form"),
            customValidationMessages: {},
            customValidators: {}
        };

         // add form validation metadata
        data.form.setAttribute('data-validate', '');

        data.CheckRules = function () {
            umbracoForms.conditions.handle({
                fsConditions: data.fsConditions,
                fieldConditions: data.fieldConditions,
                values: data.contourFieldValues
            });
        };
        data.PopulateRecordValues = function () {
            var fieldId;
            data.contourFieldValues = new Array();
            for (fieldId in data.recordValues) {
                if (document.getElementById(fieldId) === null) {
                    data.contourFieldValues[fieldId] = data.recordValues[fieldId];
                }
            }
        };

        data.CheckIfElementRequired = function (element) {

            if ( element.getAttribute('data-val-required')
                 || element.getAttribute('data-val-requiredcb')
            ) {
                // set required attribute on element
                element.setAttribute('required', '');

                // check if has custom mandatory validation for current element
                if (!data.customValidationMessages[element.getAttribute('id')]) {
                    data.customValidationMessages[element.getAttribute('id')] = {};
                }

                data.customValidationMessages[element.getAttribute('id')]['messageValueMissing'] =
                    element.getAttribute('data-val-required') || element.getAttribute('data-val-requiredcb');
            }
            // if multiple select checkboxes, then has to be handled differently
            else if (element.getAttribute('data-val-requiredlist')) {
                // check if has custom mandatory validation for current element
                if (!data.customValidators[element.getAttribute('id')]) {
                    data.customValidators[element.getAttribute('id')] = [];
                }

                data.customValidators[element.getAttribute('id')].push(function (localSettings, elem) {

                    var elements = [];

                    var checkboxlist = window.closestByClass(elem, 'checkboxlist');
                    if (checkboxlist) {
                        var inputs = checkboxlist.querySelectorAll('input');
                        [].forEach.call(inputs,
                            function(input) {
                                elements.push(input);
                            });
                    }

                    var radiobuttonlist = window.closestByClass(elem, 'radiobuttonlist');
                    if (radiobuttonlist) {
                        var radios = radiobuttonlist.querySelectorAll('input');
                        [].forEach.call(radios,
                            function(radio) {
                                elements.push(radio);
                            });
                    }

                    var valid = false;
                    [].forEach.call(elements, function (element) {
                        if (element.checked) {
                            valid = true;
                        }
                    });


                    if (valid) {

                        // hide validation messages from prev validation
                        if (radiobuttonlist)
                            validate.removeError(radiobuttonlist);

                        if (checkboxlist)
                            validate.removeError(checkboxlist);
                        
                        return null;
                    }

                    // display validation message
                    if (checkboxlist) {
                        validate.showError(checkboxlist, elem.getAttribute('data-val-requiredlist'));
                    }

                    if (radiobuttonlist)
                        validate.showError(radiobuttonlist, elem.getAttribute('data-val-requiredlist'));

                    return null;
                });
            }
        };

        data.CheckIfElementPattern = function(element) {
            if (element.getAttribute('data-regex')) {
                element.setAttribute('pattern', element.getAttribute('data-regex'));
            }
        };

        data.PopulateFieldValues = function () {
            data.PopulateRecordValues();

            // selects
            var selects = document.querySelectorAll('.contourPage select, .umbraco-forms-page select');
            [].forEach.call(selects, function (select) {
                data.CheckIfElementRequired(select);
                var option = document.querySelector("option[value = '" + select.value + "']");
                var text = option.textContent || option.innerText;
                if (text && 0 < text.length) {
                    data.contourFieldValues[select.getAttribute('id')] = text;
                }
            });

            // textareas
            var textareas = document.querySelectorAll('.contourPage textarea, .umbraco-forms-page textarea');
            [].forEach.call(textareas, function (textarea) {
                data.CheckIfElementRequired(textarea);
                data.CheckIfElementPattern(textarea);

                if (textarea.value && 0 < textarea.value.length) {
                    data.contourFieldValues[textarea.getAttribute('id')] = textarea.value;
                }
            });

            // inputs
            var inputs = document.querySelectorAll('.contourPage input, .umbraco-forms-page input');
            [].forEach.call(inputs, function (input) {

                data.CheckIfElementRequired(input);
                data.CheckIfElementPattern(input);

                if (input.type == "text" || input.type == "hidden") {
                    if (input.value && 0 < input.value.length) {
                        data.contourFieldValues[input.getAttribute('id')] = input.value;
                    } 
                }

                if (input.type == "radio") {
                    if (input.checked) {
                        data.contourFieldValues[input.getAttribute('name')] = input.value;
                    }
                }

                if (input.type == "checkbox") {
                    if (input.getAttribute('name') != input.getAttribute('id')) {
                        if (input.checked) {
                            if (data.contourFieldValues[input.getAttribute('name')] == null) {
                                data.contourFieldValues[input.getAttribute('name')] = input.value;
                            }
                            else {
                                data.contourFieldValues[input.getAttribute('name')] = data.contourFieldValues[input.getAttribute('name')] + "," + input.value;
                            }
                        }
                    }
                    else {
                        data.contourFieldValues[input.getAttribute('name')] = input.checked.toString();
                    }

                    
                }
            });
        };

        data.PopulateFieldValues();
        data.CheckRules();
        umbracoForms.validate(data.customValidationMessages, data.customValidators);
 
        var listenOnChangeElements = document.querySelectorAll(".umbraco-forms-page input, .umbraco-forms-page textarea, .umbraco-forms-page select" +
            ", .contourPage input, .contourPage textarea, .contourPage select");
        for (i = 0; i < listenOnChangeElements.length; i++) {

            listenOnChangeElements[i].addEventListener("change", function () {
                // reset custom validators and messages, to avoid dublicates
                data.customValidators = [];
                data.customValidationMessages = {};

                data.PopulateFieldValues();
                data.CheckRules();
            });

        }

        
    }
