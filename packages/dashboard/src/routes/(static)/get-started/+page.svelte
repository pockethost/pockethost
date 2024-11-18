<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import StepContainer from './StepContainer.svelte'

  let step = 0

  const setStep = (n: number) => {
    step = n
  }
</script>

<svelte:head>
  <title>Home - PocketHost</title>
</svelte:head>

<div>
  <div
    class="mx-auto flex items-center justify-center border rounded-lg m-4 w-[330px]"
  >
    <div>
      <Logo />
      <progress
        class="progress progress-primary w-full"
        value={step + 1}
        max={4}
      ></progress>

      <div class="relative h-[400px] w-[325px] overflow-hidden p-4">
        <StepContainer {step} n={0} title="Welcome to PocketHost! ">
          <div class="mt-2">
            You're 30 seconds away from your first PocketHost instance. Let's
            get started with an email address. We'll send you a login code.
          </div>
          <div class="mt-2">
            <input
              type="email"
              name="email"
              class="input input-bordered w-full max-w-xs"
              placeholder="elon@musk.com"
              required
            />
          </div>
        </StepContainer>
        <StepContainer {step} n={1} title="Confirm your email address">
          <div class="mt-2">
            We sent a code to your email address. Please enter it below.
          </div>
          <div class="mt-2">
            <input
              type="number"
              name="code"
              class="input input-bordered w-full max-w-xs"
              placeholder="123456"
              required
            />
          </div>
        </StepContainer>
        <StepContainer
          {step}
          n={2}
          title="Where would you like [instance] to run from?"
        >
          <select class="select select-bordered w-full max-w-[250px]">
            <option disabled selected>Select a region</option>
            <option value="ams">Amsterdam, Netherlands</option>
            <option value="iad">Ashburn, Virginia (US)</option>
            <option value="atl">Atlanta, Georgia (US)</option>
            <option value="bog">Bogotá, Colombia</option>
            <option value="bos">Boston, Massachusetts (US)</option>
            <option value="otp">Bucharest, Romania</option>
            <option value="ord">Chicago, Illinois (US)</option>
            <option value="dfw">Dallas, Texas (US)</option>
            <option value="den">Denver, Colorado (US)</option>
            <option value="eze">Ezeiza, Argentina</option>
            <option value="fra">Frankfurt, Germany</option>
            <option value="gdl">Guadalajara, Mexico</option>
            <option value="hkg">Hong Kong, Hong Kong</option>
            <option value="jnb">Johannesburg, South Africa</option>
            <option value="lhr">London, United Kingdom</option>
            <option value="lax">Los Angeles, California (US)</option>
            <option value="mad">Madrid, Spain</option>
            <option value="mia">Miami, Florida (US)</option>
            <option value="yul">Montreal, Canada</option>
            <option value="bom">Mumbai, India</option>
            <option value="cdg">Paris, France</option>
            <option value="phx">Phoenix, Arizona (US)</option>
            <option value="qro">Querétaro, Mexico</option>
            <option value="gig">Rio de Janeiro, Brazil</option>
            <option value="sjc">San Jose, California (US)</option>
            <option value="scl">Santiago, Chile</option>
            <option value="gru">Sao Paulo, Brazil</option>
            <option value="sea">Seattle, Washington (US)</option>
            <option value="ewr">Secaucus, NJ (US)</option>
            <option value="sin">Singapore, Singapore</option>
            <option value="arn">Stockholm, Sweden</option>
            <option value="syd">Sydney, Australia</option>
            <option value="nrt">Tokyo, Japan</option>
            <option value="yyz">Toronto, Canada</option>
            <option value="waw">Warsaw, Poland</option>
          </select>
        </StepContainer>
        <StepContainer
          {step}
          n={2}
          title="Let's start by verifying an email address."
        />
      </div>
      <div class="flex justify-center p-2">
        <button
          class="btn btn-neutral btn-sm"
          on:click={() => setStep(step - 1)}
          disabled
        >
          Back
        </button>
        <button
          class="btn btn-success btn-sm"
          on:click={() => setStep(step + 1)}
        >
          Next
        </button>
      </div>
    </div>
  </div>
</div>
