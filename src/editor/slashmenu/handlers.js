import { getFormValues } from "../../util.js";

export function formHandlerLanguage(e) {
  e.preventDefault();
  e.stopPropagation();

  const formValues = getFormValues(e.target);
  console.log(formValues);
  const language = formValues['language'];


  console.log("language handler")
}

export function formHandlerLicense() {
    
}

export function formHandlerInbox() {
//process form 

// assemble htmlString

// create fragment

// submitButton.addEventListener("click", () => {
  //   this.replaceSelectionWithFragment(fragment);
  //   this.hideMenu();
  // });

}

export function formHandlerInReplyTo() {
    
}

export function formHandlerDocumentType() {

}
