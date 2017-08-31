var umbracoForms = umbracoForms || {};

new function () {
    console.log("umbracoforms-conditions");

    var conditions = umbracoForms.conditions || {},
        operators = conditions.operators || {
            Is: function (value, expected) {
                return (value || "") === expected;
            },
            IsNot: function (value, unexpected) {
                return (value || "") !== unexpected;
            },
            GreaterThen: function (value, limit) {
                return parseInt(value) > parseInt(limit);
            },
            LessThen: function (value, limit) {
                return parseInt(value) < parseInt(limit);
            },
            StartsWith: function (value, criteria) {
                return value && value.indexOf(criteria) === 0;
            },
            EndsWith: function (value, criteria) {
                return value && value.indexOf(criteria) === value.length - criteria.length;
            },
            Contains: function (value, criteria) {
                return value && value.indexOf(criteria) > -1;
            }
        };

    umbracoForms.conditions = conditions;
    umbracoForms.conditions.operators = operators;

    conditions.handle = function (params) {

        var fsId,
            fieldId,
            fsConditions = params.fsConditions || {},
            fieldConditions = params.fieldConditions || {},
            values = params.values || {},
            cachedResults = {};

        function evaluateRuleInstance(rule) {
            var value = values[rule.field],
                func = operators[rule.operator],
                result = value !== null && func(value, rule.value);
                // console.log(rule.field + ": " + value + " " + rule.operator + " " + rule.value + " = " + result + "\n");
            return result;
        }

        function evaluateConditionVisibility(id, condition) {
            var show = condition.actionType === "Show",
                cachedResult = cachedResults[id],
                success = cachedResult === undefined
                    ? (cachedResults[id] = evaluateCondition(id, condition))
                    : cachedResult,
                visible = !(success ^ show);
            return visible;
        }

        function isVisible(id, condition) {
            if (condition) {
                return evaluateConditionVisibility(id, condition);
            }
            return true;
        }

        function evaluateRule(rule) {
            var dependencyIsVisible = true;

            if (fieldConditions[rule.field]) {
                dependencyIsVisible = isVisible(rule.field, fieldConditions[rule.field]);
            }

            if (dependencyIsVisible) {
                return evaluateRuleInstance(rule);
            } else {
                return false;
            }
        }

        function evaluateCondition(id, condition) {
            // This was once pretty. Now it needs refactoring again. :)

            var any = condition.logicType === "Any",
                all = condition.logicType === "All",
                fieldsetVisibilities = {},
                hasHiddenFieldset = false,
                success = true,
                rule,
                i;

            for (i = 0; i < condition.rules.length; i++) {
                rule = condition.rules[i];

                if (id === rule.field || id === rule.fieldsetId) {
                    throw new Error("Field or fieldset " + id + " has a condition on itself.");
                }

                if (fieldsetVisibilities[rule.fieldsetId] !== undefined) {
                    continue;
                }

                if (fsConditions[rule.fieldsetId]) {
                    fieldsetVisibilities[rule.fieldsetId] = isVisible(rule.fieldsetId, fsConditions[rule.fieldsetId]);
                    if (!fieldsetVisibilities[rule.fieldsetId]) {
                        hasHiddenFieldset = true;
                    }
                } else {
                    fieldsetVisibilities[rule.fieldsetId] = true;
                }
            }

            if (all && hasHiddenFieldset) {
                return false;
            }

            for (i = 0; i < condition.rules.length; i++) {
                rule = condition.rules[i];

                if (fieldsetVisibilities[rule.fieldsetId]) {
                    success = evaluateRule(condition.rules[i]);
                } else {
                    success = false;
                }

                if (any && success) {
                    break;
                }
                if (all && !success) {
                    break;
                }
            }
            return success;
        }

        function handleCondition(element, id, condition, type) {
            // console.log(type + " " + id);
            var shouldShow = isVisible(id, condition);
            if (shouldShow) {
                // console.log("showing " + id + "\n");
                element.style.display = '';
            } else {
                // console.log("hiding " + id + "\n");
                element.style.display = 'none';
            }
        }

        var closestByClass = function (el, clazz) {
            // Traverse the DOM up with a while loop
            
            while (!el.classList.contains(clazz)) {
                // Increment the loop to the parent node
                el = el.parentNode;
                if (!el) {
                    return null;
                }
            }
            // At this point, the while loop has stopped and `el` represents the element that has
            // the class you specified in the second parameter of the function `clazz`

            // Then return the matched element
            return el;
        }

        for (fsId in fsConditions) {
            var fieldSet = document.querySelector("[id='" + fsId + "']");
            handleCondition(fieldSet, fsId, fsConditions[fsId], "Fieldset");
        }

        for (fieldId in fieldConditions) {
            var field = document.querySelector("[id='" + fieldId + "']");
            var closest = closestByClass(field, 'umbraco-forms-field');
            handleCondition(closest, fieldId, fieldConditions[fieldId], "Field");
        }

    } // end of conditions.handle
}