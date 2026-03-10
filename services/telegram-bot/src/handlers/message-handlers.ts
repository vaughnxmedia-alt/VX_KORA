import TelegramBot from "node-telegram-bot-api"
import { getOrchestrator } from "../pipeline/orchestrator"
import { getTenantProfileByTelegramId } from "../db/tenant-profiles"
import { logInboundMessage, logOutboundQuestion } from "../db/telegram-messages"
import { getIntakeAnswersBySession } from "../db/intake-answers"
import { INTAKE_QUESTIONS, getNextQuestion, getCurrentQuestionId } from "../questions/intake-questions"

interface ActiveSession {
  runId: string
  currentQuestionIndex: number
  awaitingClarification: boolean
  clarificationQuestionId?: string
}

const activeSessions = new Map<number, ActiveSession>()

export async function handleNewStrategyTrigger(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id
  const username = msg.from?.username || null

  if (!telegramId) {
    await bot.sendMessage(chatId, "Could not identify user.")
    return
  }

  try {
    const orchestrator = getOrchestrator()
    const context = await orchestrator.startPipeline(
      telegramId,
      chatId,
      username
    )

    activeSessions.set(telegramId, {
      runId: context.runId,
      currentQuestionIndex: 0,
      awaitingClarification: false,
    })

    await bot.sendMessage(chatId, 
      `Great! Let's build your brand strategy.\n\n` +
      `I'll ask you a series of questions to understand your brand. ` +
      `Take your time and be as detailed as possible.\n\n` +
      `Ready? Here's the first question:`
    )

    await sendQuestion(bot, chatId, telegramId, 0, context.runId)

  } catch (error) {
    console.error("Error starting new strategy:", error)
    await bot.sendMessage(chatId, 
      "I encountered an issue starting your session. Please try again or type /restart."
    )
  }
}

export async function handleIntakeResponse(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id
  const text = msg.text?.trim()

  if (!telegramId || !text) return

  const session = activeSessions.get(telegramId)
  if (!session) {
    await bot.sendMessage(chatId,
      "You don't have an active session. Type @koranewstrategy to start!"
    )
    return
  }

  try {
    await logInboundMessage(
      session.runId,
      telegramId,
      chatId,
      text,
      msg.message_id
    )

    const orchestrator = getOrchestrator()
    const context = orchestrator.getActiveContext(session.runId)

    if (!context) {
      activeSessions.delete(telegramId)
      await bot.sendMessage(chatId,
        "Your session expired. Type @koranewstrategy to start again."
      )
      return
    }

    const currentQuestion = session.awaitingClarification && session.clarificationQuestionId
      ? INTAKE_QUESTIONS.find(q => q.id === session.clarificationQuestionId)
      : INTAKE_QUESTIONS[session.currentQuestionIndex]

    if (!currentQuestion) {
      await bot.sendMessage(chatId, "Error: Could not find current question. Please type /restart.")
      return
    }

    const result = await orchestrator.processIntakeAnswer(context, {
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      rawAnswer: text,
    })

    if (result.clarificationNeeded && result.nextQuestion) {
      session.awaitingClarification = true
      session.clarificationQuestionId = currentQuestion.id
      
      await bot.sendMessage(chatId, result.nextQuestion)
      await logOutboundQuestion(
        session.runId,
        telegramId,
        chatId,
        result.nextQuestion
      )
      return
    }

    session.awaitingClarification = false
    session.clarificationQuestionId = undefined

    if (result.isComplete) {
      activeSessions.delete(telegramId)
      return
    }

    session.currentQuestionIndex++
    
    if (session.currentQuestionIndex < INTAKE_QUESTIONS.length) {
      await sendQuestion(bot, chatId, telegramId, session.currentQuestionIndex, session.runId)
    } else {
      activeSessions.delete(telegramId)
      
      await bot.sendMessage(chatId,
        "Thank you for completing all the questions!\n\n" +
        "I'm now generating your strategy documents. This may take a few minutes..."
      )
      
      await orchestrator.runPostIntakePipeline(context)
    }

  } catch (error) {
    console.error("Error processing intake response:", error)
    await bot.sendMessage(chatId,
      "I had trouble processing that response. Please try again or type /restart."
    )
  }
}

async function sendQuestion(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  questionIndex: number,
  runId: string
): Promise<void> {
  const question = INTAKE_QUESTIONS[questionIndex]
  if (!question) return

  let messageText = question.question

  if (question.followUp) {
    messageText += `\n\n${question.followUp}`
  }

  if (question.examples && question.examples.length > 0) {
    messageText += `\n\nExamples:\n${question.examples.map(e => `- ${e}`).join("\n")}`
  }

  const progress = `(${questionIndex + 1}/${INTAKE_QUESTIONS.length})`
  messageText = `${progress} ${messageText}`

  const sent = await bot.sendMessage(chatId, messageText)

  await logOutboundQuestion(
    runId,
    telegramId,
    chatId,
    messageText,
    sent.message_id
  )
}

export function hasActiveSession(telegramId: number): boolean {
  return activeSessions.has(telegramId)
}

export function getActiveSession(telegramId: number): ActiveSession | undefined {
  return activeSessions.get(telegramId)
}

export function clearSession(telegramId: number): void {
  activeSessions.delete(telegramId)
}
