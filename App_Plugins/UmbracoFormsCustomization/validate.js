(function (root, factory) {
	if ( typeof define === 'function' && define.amd ) {
		define([], factory(root));
	} else if ( typeof exports === 'object' ) {
		module.exports = factory(root);
	} else {
		root.validate = factory(root);
	}
})(typeof global !== 'undefined' ? global : this.window || this.global, function (root) {

	'use strict';

	//
	// Variables
	//

	var validate = {}; // Object for public APIs
	var supports = 'querySelector' in document && 'addEventListener' in root; // Feature test
	var settings;

	// Default settings
	var defaults = {

		// Classes and Selectors
		selector: '[data-validate]',
		fieldClass: 'error',
		errorClass: 'error-message',

		// Messages
		messageValueMissing: 'Please fill out this field.',
		messageTypeMismatchEmail: 'Please enter an email address.',
		messageTypeMismatchURL: 'Please enter a URL.',
		messageTooShort: 'Please lengthen this text to {minLength} characters or more. You are currently using {length} characters.',
		messageTooLong: 'Please shorten this text to no more than {maxLength} characters. You are currently using {length} characters.',
		messagePatternMismatch: 'Please match the requested format.',
		messageBadInput: 'Please enter a number.',
		messageStepMismatch: 'Please select a valid value.',
		messageRangeOverflow: 'Please select a value that is no more than {max}.',
		messageRangeUnderflow: 'Please select a value that is no less than {min}.',
        messageGeneric: 'The value you entered for this field is invalid.',

        // Custom Validation Messages
		customValidationMessages: {},
		validationMessageElement: null,

        // Custom Validators
        customValidators: {},
        validateHiddenFields: true,

		// Form Submission
		disableSubmit: false,
		onSubmit: function () {},

		// Callbacks
		beforeShowError: function () {},
		afterShowError: function () {},
		beforeRemoveError: function () {},
		afterRemoveError: function () {},

	};


	//
	// Methods
	//

	// Element.matches() polyfill
	if (!Element.prototype.matches) {
		Element.prototype.matches =
			Element.prototype.matchesSelector ||
			Element.prototype.mozMatchesSelector ||
			Element.prototype.msMatchesSelector ||
			Element.prototype.oMatchesSelector ||
			Element.prototype.webkitMatchesSelector ||
			function(s) {
				var matches = (this.document || this.ownerDocument).querySelectorAll(s),
					i = matches.length;
				while (--i >= 0 && matches.item(i) !== this) {}
				return i > -1;
			};
	}

	/**
	 * Merge two or more objects. Returns a new object.
	 * @private
	 * @param {Boolean}  deep     If true, do a deep (or recursive) merge [optional]
	 * @param {Object}   objects  The objects to merge together
	 * @returns {Object}          Merged values of defaults and options
	 */
	var extend = function () {

		// Variables
		var extended = {};
		var deep = false;
		var i = 0;
		var length = arguments.length;

		// Check if a deep merge
		if ( Object.prototype.toString.call( arguments[0] ) === '[object Boolean]' ) {
			deep = arguments[0];
			i++;
		}

		// Merge the object into the extended object
		var merge = function (obj) {
			for ( var prop in obj ) {
				if ( Object.prototype.hasOwnProperty.call( obj, prop ) ) {
					// If deep merge and property is an object, merge properties
					if ( deep && Object.prototype.toString.call(obj[prop]) === '[object Object]' ) {
						extended[prop] = extend( true, extended[prop], obj[prop] );
					} else {
						extended[prop] = obj[prop];
					}
				}
			}
		};

		// Loop through each object and conduct a merge
		for ( ; i < length; i++ ) {
			var obj = arguments[i];
			merge(obj);
		}

		return extended;

	};

	/**
	 * Get the closest matching element up the DOM tree.
	 * @private
	 * @param  {Element} elem     Starting element
	 * @param  {String}  selector Selector to match against
	 * @return {Boolean|Element}  Returns null if not match found
	 */
	var getClosest = function ( elem, selector ) {
		for ( ; elem && elem !== document; elem = elem.parentNode ) {
			if ( elem.matches( selector ) ) return elem;
		}
		return null;
	};

    /**
     * Try to get custom validation message for element and it's validity state
     * @private
     * @param  {Object} localSettings           Local settings of scope
     * @param  {Element} elem                   Current input element
     * @param  {String} validityState   Validity state of current element
     */
    var getErrorMessage = function (localSettings, elem, validityState) {

        if (!localSettings.customValidationMessages)
            return null;

        if (!elem.getAttribute('id'))
            return null;

        if (!localSettings.customValidationMessages[elem.getAttribute('id')])
            return null;

        if (localSettings.customValidationMessages[elem.getAttribute('id')][validityState])
            return localSettings.customValidationMessages[elem.getAttribute('id')][validityState];

        return null;
    };

    /**
     * Validate element using users custom defined validators if possible
     * Return string error message or null, if element state is valid
     * @private
     * @param  {Object} localSettings   Local settings of scope
     * @param  {Element} elem           Current input element
     */
    var validateUsingCustomValidators = function (localSettings, elem) {

        if (!elem.getAttribute('id'))
            return null;

        if (!localSettings.customValidators[elem.getAttribute('id')])
            return null;

        // loop through validators
        for (var index = 0; index < localSettings.customValidators[elem.getAttribute('id')].length; index++) {
            var errorMessage = localSettings.customValidators[elem.getAttribute('id')][index](localSettings, elem);

            if (errorMessage) {
                return errorMessage;
            }
        }
    };

	/**
	 * Validate a form field
	 * @public
	 * @param  {Node}    field   The field to validate
	 * @param  {Object}  options User options
	 * @return {String}          The error message
	 */
	validate.hasError = function (field, options) {

		// Merge user options with existing settings or defaults
		var localSettings = extend(settings || defaults, options || {});

		// Don't validate submits, buttons, file and reset inputs, and disabled fields
		if (field.disabled || field.type === 'file' || field.type === 'reset' || field.type === 'submit' || field.type === 'button') return;

        // If options force to not validate invisible fields
        if (localSettings.validateHiddenFields == false) {
            // get and check fields visibility 
            var isVisible = field.offsetWidth > 0 || field.offsetHeight > 0;

            if (isVisible == false)
                return;
        }

		// Get validity
        var validity = field.validity;

	    // Validate element using users custom validators
        if (localSettings.customValidators) {
	        var customValidationResponse = validateUsingCustomValidators(localSettings, field);
	        if (customValidationResponse)
	            return customValidationResponse;
	    }

		// If valid, return null
        if (validity.valid) return;

		// If field is required and empty
        if (validity.valueMissing) return getErrorMessage(localSettings, field, 'messageValueMissing') || localSettings.messageValueMissing;

		// If not the right type
		if (validity.typeMismatch) {

			// Email
            if (field.type === 'email') return getErrorMessage(localSettings, field, 'messageTypeMismatchEmail') || localSettings.messageTypeMismatchEmail;

			// URL
            if (field.type === 'url') return getErrorMessage(localSettings, field, 'messageTypeMismatchURL') || localSettings.messageTypeMismatchURL;

		}

		// If too short
		if (validity.tooShort) {
            var message = getErrorMessage(localSettings, field, 'messageTooShort') || localSettings.messageTooShort;
            return message.replace('{minLength}', field.getAttribute('minLength')).replace('{length}', field.value.length);
		}

		// If too long
		if (validity.tooLong) {
            var message = getErrorMessage(localSettings, field, 'messageTooLong') || localSettings.messageTooLong;
            return message.replace('{minLength}', field.getAttribute('maxLength')).replace('{length}', field.value.length);
		}

		// If number input isn't a number
        if (validity.badInput) return getErrorMessage(localSettings, field, 'messageBadInput') || localSettings.messageBadInput;

		// If a number value doesn't match the step interval
        if (validity.stepMismatch) return getErrorMessage(localSettings, field, 'messageStepMismatch') || localSettings.messageStepMismatch;

		// If a number field is over the max
		if (validity.rangeOverflow) {
            var message = getErrorMessage(localSettings, field, 'messageRangeOverflow') || localSettings.messageRangeOverflow;
            return message.replace('{max}', field.getAttribute('max'));
		}

		// If a number field is below the min
        if (validity.rangeUnderflow) {
            var message = getErrorMessage(localSettings, field, 'messageRangeUnderflow') || localSettings.messageRangeUnderflow;
            return message.replace('{min}', field.getAttribute('min'));
		}

		// If pattern doesn't match
		if (validity.patternMismatch) {

			// If pattern info is included, return custom error
			if (field.hasAttribute('title')) return field.getAttribute('title');

			// Otherwise, generic error
            return getErrorMessage(localSettings, field, 'messagePatternMismatch') || localSettings.messagePatternMismatch;
		}

		// If all else fails, return a generic catchall error
        return getErrorMessage(localSettings, field, 'messageGeneric') || localSettings.messageGeneric;

	};

	/**
	 * Show an error message on a field
	 * @public
	 * @param  {Node}   field   The field to show an error message for
	 * @param  {String} error   The error message to show
	 * @param  {Object} options User options
	 */
	validate.showError = function (field, error, options) {

		// Merge user options with existing settings or defaults
		var localSettings = extend(settings || defaults, options || {});

		// Before show error callback
		localSettings.beforeShowError(field, error);

	    // If error is empty, set missing value
        if (!error || error.length === 0) {
            error = localSettings.messageValueMissing;
        }

		// Add error class to field
		field.classList.add(localSettings.fieldClass);

		// If the field is a radio button and part of a group, error all and get the last item in the group
		if (field.type === 'radio' && field.name) {
			var group = document.getElementsByName(field.name);
			if (group.length > 0) {
				for (var i = 0; i < group.length; i++) {
					if (group[i].form !== field.form) continue; // Only check fields in current form
					group[i].classList.add(localSettings.fieldClass);
				}
				field = group[group.length - 1];
			}
		}

		// Get field id or name
		var id = field.id || field.name;
		if (!id) return;

		// Ensure that form is set on field
        if (!field.form) {
            field.form = getClosest(field, 'form');
	    }

	    // Check if error message field already exists
	    // If not, create one
		var message = field.form.querySelector('.' + localSettings.errorClass + '#error-for-' + id );
		if (!message) {
			message = document.createElement(localSettings.validationMessageElement || 'div');
			message.className = localSettings.errorClass;
			message.id = 'error-for-' + id;

			// If the field is a radio button or checkbox, insert error after the label
			var label;
			if (field.type === 'radio' || field.type ==='checkbox') {
				label = field.form.querySelector('label[for="' + id + '"]') || getClosest(field, 'label');
				if (label) {
					label.parentNode.insertBefore( message, label.nextSibling );
				}
			}

			// Otherwise, insert it after the field
			if (!label) {
				field.parentNode.insertBefore( message, field.nextSibling );
			}
		}

		// Add ARIA role to the field
		field.setAttribute('aria-describedby', 'error-for-' + id);

		// Update error message
		message.innerHTML = error;

		// Show error message
		message.style.display = 'block';
		message.style.visibility = 'visible';

		// After show error callback
		localSettings.afterShowError(field, error);

	};

	/**
	 * Remove an error message from a field
	 * @public
	 * @param  {Node}   field   The field to remove the error from
	 * @param  {Object} options User options
	 */
	validate.removeError = function (field, options) {

		// Merge user options with existing settings or defaults
		var localSettings = extend(settings || defaults, options || {});

		// Before remove error callback
		localSettings.beforeRemoveError(field);

		// Remove ARIA role from the field
		field.removeAttribute('aria-describedby');

		// Remove error class to field
		field.classList.remove(localSettings.fieldClass);

		// If the field is a radio button and part of a group, remove error from all and get the last item in the group
		if (field.type === 'radio' && field.name) {
			var group = document.getElementsByName(field.name);
			if (group.length > 0) {
				for (var i = 0; i < group.length; i++) {
					if (group[i].form !== field.form) continue; // Only check fields in current form
					group[i].classList.remove(localSettings.fieldClass);
				}
				field = group[group.length - 1];
			}
		}

		// Get field id or name
		var id = field.id || field.name;
        if (!id) return;

	    // Ensure that form is set on field
	    if (!field.form) {
	        field.form = getClosest(field, 'form');
	    }

		// Check if an error message is in the DOM
		var message = field.form.querySelector('.' + localSettings.errorClass + '#error-for-' + id + '');
		if (!message) return;

		// If so, hide it
		message.innerHTML = '';
		message.style.display = 'none';
		message.style.visibility = 'hidden';

		// After remove error callback
		localSettings.afterRemoveError(field);

	};

	/**
	 * Add the `novalidate` attribute to all forms
	 * @private
	 * @param {Boolean} remove  If true, remove the `novalidate` attribute
	 */
	var addNoValidate = function (remove) {
		var forms = document.querySelectorAll(settings.selector);
		for (var i = 0; i < forms.length; i++) {
			if (remove) {
				forms[i].removeAttribute('novalidate');
				continue;
			}
			forms[i].setAttribute('novalidate', true);
		}
	};

	/**
	 * Check field validity when it loses focus
	 * @private
	 * @param  {Event} event The blur event
	 */
	var blurHandler = function (event) {

		// Only run if the field is in a form to be validated
		if (!event.target.form || !event.target.form.matches(settings.selector)) return;

		// Validate the field
		var error = validate.hasError(event.target);

		// If there's an error, show it
		if (error) {
			validate.showError(event.target, error);
			return;
		}

		// Otherwise, remove any errors that exist
		validate.removeError(event.target);

	};

	/**
	 * Check all fields on submit
	 * @private
	 * @param  {Event} event  The submit event
	 */
	var submitHandler = function (event) {

		// Only run on forms flagged for validation
		if (!event.target.matches(settings.selector)) return;

		// Get all of the form elements
		var fields = event.target.elements;

		// Validate each field
		// Store the first field with an error to a variable so we can bring it into focus later
		var hasErrors;
		for (var i = 0; i < fields.length; i++) {
			var error = validate.hasError(fields[i]);
			if (error) {
				validate.showError(fields[i], error);
				if (!hasErrors) {
					hasErrors = fields[i];
				}
			}
		}

		// Prevent form from submitting if there are errors or submission is disabled
		if (hasErrors || settings.disableSubmit) {
			event.preventDefault();
		}

		// If there are errrors, focus on first element with error
		if (hasErrors) {
			hasErrors.focus();
			return;
		}

		// Otherwise, submit the form
		settings.onSubmit(event.target, fields);

	};

	/**
	 * Destroy the current initialization.
	 * @public
	 */
	validate.destroy = function () {

		// If plugin isn't already initialized, stop
		if ( !settings ) return;

		// Remove event listeners
		document.removeEventListener('blur', blurHandler, false);
		document.removeEventListener('submit', submitHandler, false);

		// Remove all errors
		var fields = document.querySelectorAll(settings.errorClass);
		for (var i = 0; i < fields.length; i++) {
			validate.removeError(fields[i]);
		}

		// Remove `novalidate` from forms
		addNoValidate(true);

		// Reset variables
		settings = null;

	};

	/**
	 * Initialize Validate
	 * @public
	 * @param {Object} options User settings
	 */
	validate.init = function (options) {

		// feature test
		if (!supports) return;

		// Destroy any existing initializations
		validate.destroy();

		// Merge user options with defaults
		settings = extend(defaults, options || {});

		// Add the `novalidate` attribute to all forms
		addNoValidate();

		// Event listeners
		document.addEventListener('blur', blurHandler, true);
		document.addEventListener('submit', submitHandler, false);

	};


	//
	// Public APIs
	//

	return validate;

});