import base from "@playwright/test";
export class Auth {
  constructor(page, isMobile) {
    this.page = page;
    this.isMobile = isMobile;
  }

  async login() {
    await this.page.goto("/");
    await this.page.locator("#document-menu button").click();

    if (this.isMobile) {
      await this.page.locator(".close").click();
    }

    const signinbtn = "button.signin-user";
    await this.page.waitForSelector(signinbtn);
    await this.page.click(signinbtn);

    await this.page.fill('input[id="webid"]', process.env.WEBID);
    await this.page.click('button[class="signin"]');

    await this.page.waitForURL(
      "https://solidcommunity.net/.account/login/password/"
    );
    await this.page.waitForSelector("input#email");

    await this.page.fill("#email", process.env.LOGIN_ID);
    await this.page.fill("#password", process.env.LOGIN_PASSWORD);
    await this.page.click("button[type=submit]");

    // click login btn
    await this.page.waitForSelector("button[type=submit]");
    await this.page.click("button[type=submit]");

    // await redirect to consent page
    await this.page.waitForURL("https://solidcommunity.net/.account/");
    await this.page.waitForURL(
      "https://solidcommunity.net/.account/oidc/consent/"
    );

    // click authorize btn
    await this.page.waitForSelector("button[type=submit]");
    await this.page.click("button[type=submit]");

    // wait to redirect to homepage
    await this.page.waitForURL("http://localhost:3000/");


    // Listen for console messages to make sure we are logged in
    await this.page.on("console", async (msg) => {
      if (
        msg
          .text()
          .includes(process.env.WEBID)
      ) {

        await this.page.locator("#document-menu button").click();

        await this.page.waitForSelector("button.signout-user");
        await expect(this.page.locator("button.signout-user")).toBeVisible();
      }
    });


  }
}


export const test = base.test.extend({
  auth: async ({ page, isMobile }, use) => {
    const auth = new Auth(page, isMobile);
    await use(auth);
  },
});

export const expect = base.expect;
