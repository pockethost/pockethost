import ora from 'ora'

interface Task {
  name: string
  run: () => Promise<any>
}
export async function runTasks(tasks: Task[]): Promise<void> {
  for (const task of tasks) {
    const spinner = ora(`${task.name}...`).start()

    try {
      await task.run()
      spinner.succeed(`${task.name}`)
    } catch (error) {
      spinner.fail(`${task.name}`)
      throw error
    }
  }
}
