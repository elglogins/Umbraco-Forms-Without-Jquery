var umbracoForms = umbracoForms || {};

function onCaptchaStateChanged() {

    var captchaElement = document.querySelector('[data-validate]').querySelector('.g-recaptcha');
    if (grecaptcha.getResponse().length > 0 && captchaElement) {
        validate.removeError(captchaElement);
    }
}

new function () {
    umbracoForms.validate = function (customValidationMessages, customValidators) {

        validate.init({
            customValidationMessages: customValidationMessages,
            customValidators: customValidators,
            fieldClass: 'error', // The class to apply to fields with errors
            errorClass: 'field-validation-error', // The class to apply to error messages,
            validationMessageElement: 'span',
            disableSubmit: true, // If true, don't submit the form to the server (for Ajax for submission)
            onSubmit: function(form, fields) {

                // ensure that form is valid (especially 'data-val-requiredlist' elements)
                var requiredLists = form.querySelectorAll('[data-val-requiredlist]');

                var valid = true;
                [].forEach.call(requiredLists,
                    function (requiredList) {
                        var listElement = document.getElementById(requiredList.getAttribute('name'));
                        if (listElement.classList.contains('error')) {
                            valid = false;
                        }
                    });

                // validate if captcha is valid
                var captchaElement = form.querySelector('.g-recaptcha');
                if (captchaElement && grecaptcha) {

                    if (grecaptcha.getResponse().length === 0) {
                        valid = false;
                        validate.showError(captchaElement, captchaElement.getAttribute('data-val-required'));
                    } else {
                        validate.removeError(captchaElement);
                    }
                }

                if (valid) {
                    form.submit();
                }

            } // Function to run if the form successfully validates
        });
    };
}