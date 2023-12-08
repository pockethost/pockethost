<script lang="ts">
  import { globalInstancesStore } from '$util/stores'
  import { format, subMonths } from 'date-fns'
  import { Line } from 'svelte-chartjs'

  import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
  } from 'chart.js'

  ChartJS.register(
    Title,
    Tooltip,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    CategoryScale,
  )

  // Calculate the last six months
  const getLastSixMonths = () => {
    let currentDate = new Date()

    let months = Array.from({ length: 6 }, (_, index) => {
      let date = subMonths(currentDate, index)
      return format(date, 'MMM') // format as you need, e.g. 'yyyy-MM' will be '2023-09'
    })

    return months.reverse() // to have them in ascending order
  }

  // Temporary function to generate a random number from 1 to 60 to use in the charts
  function getRandomNumber() {
    return Math.floor(Math.random() * 60) + 1
  }

  // Temporary function to generate a random number from 60 to 250 to use in the charts
  function getRandomNumberLarge() {
    return Math.floor(Math.random() * 250) + 60
  }

  // This will generate unique colors for each of the user's instances
  const lineGraphColorArray = [
    '#1EB854',
    '#00A473',
    '#008E83',
    '#007783',
    '#005F74',
    '#2F4858',
    '#1C6E7D',
    '#039590',
    '#4BBC8E',
    '#9BDE7E',
    '#9BDE7E',
    '#4BBC8E',
    '#039590',
    '#1C6E7D',
    '#2F4858',
  ]

  // Convert the object of objects into an array of objects
  const allInstancesArray = Object.values($globalInstancesStore)

  // Loop through the instance list and build a ChartJS object for each one
  const individualInstanceUsageData = allInstancesArray.map(
    (instance, index) => {
      return {
        label: instance.subdomain,
        fill: true,
        lineTension: 0.3,
        backgroundColor: lineGraphColorArray?.[index] ?? '#fff',
        borderColor: lineGraphColorArray?.[index] ?? '#fff',
        borderCapStyle: 'round',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: '#fff',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 5,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: lineGraphColorArray?.[index] ?? '#fff',
        pointHoverBorderColor: 'rgba(220, 220, 220,1)',
        pointHoverBorderWidth: 2,
        pointRadius: 1,
        pointHitRadius: 25,
        data: [
          getRandomNumber(),
          getRandomNumber(),
          getRandomNumber(),
          getRandomNumber(),
          getRandomNumber(),
          Math.ceil(0 / 60),
        ],
      }
    },
  )

  // Loop through the instance list again, and create a "total usage" entry
  const totalUsageAmount = allInstancesArray.reduce((total) => total, 0)

  // Add up the individual instance usages and the total usage
  const allChartData: any = [
    ...individualInstanceUsageData,
    {
      label: 'All Instances',
      fill: true,
      lineTension: 0.3,
      backgroundColor: '#fff',
      borderColor: '#fff',
      borderCapStyle: 'round',
      borderDash: [],
      borderDashOffset: 0.0,
      borderJoinStyle: 'miter',
      pointBorderColor: '#fff',
      pointBackgroundColor: '#fff',
      pointBorderWidth: 5,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(220, 220, 220,1)',
      pointHoverBorderWidth: 2,
      pointRadius: 1,
      pointHitRadius: 25,
      data: [
        getRandomNumberLarge(),
        getRandomNumberLarge(),
        getRandomNumberLarge(),
        getRandomNumberLarge(),
        getRandomNumberLarge(),
        Math.ceil(totalUsageAmount / 60),
      ],
    },
  ]

  // Set the default data object for the chart
  const data: any = {
    labels: getLastSixMonths(),
    datasets: allChartData,
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'linear',
        title: {
          text: 'Minutes',
          display: true,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        padding: 24,
        cornerRadius: 16,
        titleSpacing: 12,
      },
    },
  }
</script>

<div class="card card-body bg-base-200 h-[600px] mb-4">
  <h3 class="text-xl font-bold mb-16">Usage for All Instances</h3>

  <div class="h-full">
    <Line {data} {options} />
  </div>
</div>
