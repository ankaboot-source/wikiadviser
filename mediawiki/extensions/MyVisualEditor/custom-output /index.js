document.addEventListener("DOMContentLoaded", function () {
  //Button
  function displayMessage() {
    console.log("clicked");
  }
  // get reference to button
  var btn = document.getElementById("myBtn");
  // add event listener for the button, for action "click"
  btn.addEventListener("click", displayMessage);

  //Content
  fetch("diff-output.html")
    .then((response) => response.text())
    .then((html) => {
      // Do something with the HTML string
      document.getElementById("diff-container").innerHTML = html;
    })
    .catch((error) => {
      // Handle any errors that occur
      console.error(error);
    });
});
