<?php

namespace App\Domain\Psychometric\Support;

/**
 * Research-validated 30-question bank (v2): 15 MC + 15 Likert.
 */
final class V2Questions
{
    /**
     * @return array<string, array{
     *     text: string,
     *     dimension: string,
     *     type: string,
     *     section?: string,
     *     is_reverse_scored?: bool,
     *     options?: list<array{text: string, score: int}>
     * }>
     */
    public static function all(): array
    {
        return [
            'mc_01' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'integrity',
                'text' => 'You find 500 ETB on the floor of your shop that fell from a customer\'s pocket. The customer has already left. What do you do?',
                'options' => [
                    ['text' => 'Keep it — there is no way to identify the owner.', 'score' => 1],
                    ['text' => 'Put it in the cash box in case the customer returns, but do not try to contact them.', 'score' => 2],
                    ['text' => 'Try to call the customer if you have their number; otherwise hold it safely for their return.', 'score' => 4],
                    ['text' => 'Give it to your staff to share among themselves.', 'score' => 1],
                ],
            ],
            'mc_02' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'integrity',
                'text' => 'A government tax officer miscalculates your annual tax by 3,000 ETB in your favor. What do you do?',
                'options' => [
                    ['text' => 'Say nothing and benefit from the error.', 'score' => 1],
                    ['text' => 'Wait and see if they notice and correct it on their own.', 'score' => 2],
                    ['text' => 'Inform the officer of the mistake and pay the correct amount.', 'score' => 4],
                    ['text' => 'Only correct it if you think they are likely to audit you.', 'score' => 2],
                ],
            ],
            'mc_03' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'integrity',
                'text' => 'A supplier sends you 10 extra units by mistake and does not include them in your invoice. What do you do?',
                'options' => [
                    ['text' => 'Keep the extra units — it is their mistake, not yours.', 'score' => 1],
                    ['text' => 'Sell the units and set the money aside in case they ask.', 'score' => 2],
                    ['text' => 'Contact the supplier immediately to arrange returning or paying for the units.', 'score' => 4],
                    ['text' => 'Wait one week; if no one follows up, keep them.', 'score' => 1],
                ],
            ],
            'mc_04' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'integrity',
                'text' => 'A well-connected customer asks for a 30% discount on credit, suggesting they can refer other customers. You do not normally offer such discounts. What do you do?',
                'options' => [
                    ['text' => 'Give the full 30% discount — the referrals will be worth more.', 'score' => 2],
                    ['text' => 'Decline politely and offer your standard credit terms.', 'score' => 4],
                    ['text' => 'Offer a smaller discount (e.g., 10%) and negotiate the referral arrangement.', 'score' => 3],
                    ['text' => 'Give the discount this once but do not record it in your books.', 'score' => 1],
                ],
            ],
            'mc_05' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'integrity',
                'text' => 'A bank employee informally tells you that for a small personal payment, he can guarantee your loan application will be approved. What do you do?',
                'options' => [
                    ['text' => 'Pay — securing the loan is the priority right now.', 'score' => 1],
                    ['text' => 'Refuse and report the request to bank management.', 'score' => 4],
                    ['text' => 'Refuse but stay silent and simply re-apply through the official channel.', 'score' => 3],
                    ['text' => 'Agree to pay, but only after the loan has been disbursed.', 'score' => 1],
                ],
            ],
            'mc_06' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'conscientiousness',
                'text' => 'How far in advance do you typically plan your business expenses?',
                'options' => [
                    ['text' => 'I handle expenses on the same day or as they come up.', 'score' => 1],
                    ['text' => 'I plan about a week ahead.', 'score' => 2],
                    ['text' => 'I plan a month or more ahead with a written budget.', 'score' => 4],
                    ['text' => 'I plan a few days ahead informally in my head.', 'score' => 2],
                ],
            ],
            'mc_07' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'conscientiousness',
                'text' => 'Your loan repayment is due in two weeks but your current cash flow is tight. What do you do?',
                'options' => [
                    ['text' => 'Wait and hope more sales come in before the due date.', 'score' => 1],
                    ['text' => 'Contact the lender immediately and discuss options before the due date.', 'score' => 4],
                    ['text' => 'Borrow informally from family or friends to cover the payment.', 'score' => 3],
                    ['text' => 'Pay whatever amount you have and explain the situation later.', 'score' => 2],
                ],
            ],
            'mc_08' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'conscientiousness',
                'text' => 'How do you keep records of your daily sales and expenses?',
                'options' => [
                    ['text' => 'I rely on memory and count the cash at the end of the day.', 'score' => 1],
                    ['text' => 'I write totals in a notebook each evening.', 'score' => 3],
                    ['text' => 'I use a system (book, app, or spreadsheet) that records every transaction.', 'score' => 4],
                    ['text' => 'I record only when it seems necessary.', 'score' => 2],
                ],
            ],
            'mc_09' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'conscientiousness',
                'text' => 'When you start a new business project or plan, how do you typically proceed?',
                'options' => [
                    ['text' => 'I start immediately and figure out the details as I go.', 'score' => 1],
                    ['text' => 'I think about it briefly and then begin.', 'score' => 2],
                    ['text' => 'I write a clear plan with steps, resources, and expected outcomes before starting.', 'score' => 4],
                    ['text' => 'I talk to others and gather opinions, but I do not usually write anything down.', 'score' => 3],
                ],
            ],
            'mc_10' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'delayed_gratification',
                'text' => 'A customer offers to pay you 1,000 ETB today or 1,500 ETB in two months. What do you choose?',
                'options' => [
                    ['text' => 'Take 1,000 ETB today — cash in hand is always better.', 'score' => 1],
                    ['text' => 'Wait for 1,500 ETB in two months — the extra 500 ETB is worth it.', 'score' => 4],
                    ['text' => 'Negotiate for 1,200 ETB today as a compromise.', 'score' => 3],
                    ['text' => 'Tell the customer to pay whenever it is most convenient for them.', 'score' => 2],
                ],
            ],
            'mc_11' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'delayed_gratification',
                'text' => 'Your business earns a steady profit this month beyond your needs. What do you do with the surplus?',
                'options' => [
                    ['text' => 'Spend it immediately on personal needs or lifestyle improvements.', 'score' => 1],
                    ['text' => 'Save most of it for the business and use a small portion for personal needs.', 'score' => 4],
                    ['text' => 'Reinvest all of it immediately into more stock or a new business activity.', 'score' => 3],
                    ['text' => 'Lend it informally to others to earn interest.', 'score' => 2],
                ],
            ],
            'mc_12' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'delayed_gratification',
                'text' => 'Your last business venture did not succeed as expected. What was the main reason?',
                'options' => [
                    ['text' => 'Market conditions and the economy were against me — it was outside my control.', 'score' => 1],
                    ['text' => 'Competitors made it very difficult for me to compete.', 'score' => 2],
                    ['text' => 'A combination of timing and some of my own decisions.', 'score' => 3],
                    ['text' => 'I made decisions I would change — I learned important lessons from the experience.', 'score' => 4],
                ],
            ],
            'mc_13' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'financial_risk',
                'text' => 'You are offered a business partnership that promises to double your investment in 30 days. The person seems trustworthy. What do you do?',
                'options' => [
                    ['text' => 'Invest all your available money immediately.', 'score' => 1],
                    ['text' => 'Invest a small amount you can afford to lose and observe before investing more.', 'score' => 3],
                    ['text' => 'Ask for full documentation and a written contract before investing anything.', 'score' => 4],
                    ['text' => 'Decline entirely — any promise of doubling money in 30 days is a warning sign.', 'score' => 4],
                ],
            ],
            'mc_14' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'financial_risk',
                'text' => 'You can take a large loan to expand your business rapidly, or a smaller loan that fits your current repayment capacity. What do you choose?',
                'options' => [
                    ['text' => 'Take the large loan — high risk, high reward.', 'score' => 1],
                    ['text' => 'Take the smaller loan that I can repay comfortably given my current cash flow.', 'score' => 4],
                    ['text' => 'Take no loan — I prefer to grow using only my own money.', 'score' => 2],
                    ['text' => 'Ask the bank to decide what size loan is appropriate for me.', 'score' => 2],
                ],
            ],
            'mc_15' => [
                'section' => 'A',
                'type' => 'choice',
                'dimension' => 'financial_risk',
                'text' => 'Your most loyal customer asks for credit equal to 40% of your monthly sales. They have always paid on time before. What do you do?',
                'options' => [
                    ['text' => 'Give the full credit immediately — their track record is reliable.', 'score' => 2],
                    ['text' => 'Offer credit at a reduced maximum you are comfortable extending.', 'score' => 4],
                    ['text' => 'Decline — no credit regardless of the relationship.', 'score' => 1],
                    ['text' => 'Give the full credit but require partial advance payment and a signed agreement.', 'score' => 3],
                ],
            ],
            'ad_01' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'integrity',
                'is_reverse_scored' => false,
                'text' => 'I would rather lose a sale than be dishonest with a customer about the quality of my products or services.',
            ],
            'ad_02' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'integrity',
                'is_reverse_scored' => true,
                'text' => 'In business, bending the rules slightly is acceptable if it helps the business survive and grow.',
            ],
            'ad_03' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'integrity',
                'is_reverse_scored' => false,
                'text' => 'If I made a financial error that accidentally benefited my business, I would always correct it, even if it cost me money.',
            ],
            'ad_04' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'integrity',
                'is_reverse_scored' => true,
                'text' => 'Everyone in business makes small ethical compromises — it is unavoidable if you want to succeed.',
            ],
            'ad_05' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'conscientiousness',
                'is_reverse_scored' => false,
                'text' => 'I set clear weekly or monthly financial targets for my business and track whether I am meeting them.',
            ],
            'ad_06' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'conscientiousness',
                'is_reverse_scored' => false,
                'text' => 'When I commit to a repayment date or delivery deadline, I make sure to meet it even if it requires extra effort.',
            ],
            'ad_07' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'conscientiousness',
                'is_reverse_scored' => true,
                'text' => 'I often focus on today\'s urgent tasks and leave detailed planning for another day.',
            ],
            'ad_08' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'conscientiousness',
                'is_reverse_scored' => false,
                'text' => 'Before making any significant business expense, I always verify that my business has enough funds to cover it without affecting operations.',
            ],
            'ad_09' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'delayed_gratification',
                'is_reverse_scored' => false,
                'text' => 'I am willing to reduce my personal spending today in order to keep my business financially stable and growing for the future.',
            ],
            'ad_10' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'delayed_gratification',
                'is_reverse_scored' => true,
                'text' => 'When money comes into the business from sales, I find it hard to resist spending some of it on personal things, even when I have upcoming business obligations.',
            ],
            'ad_11' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'delayed_gratification',
                'is_reverse_scored' => false,
                'text' => 'I would accept a lower but guaranteed return on an investment rather than risk a higher but uncertain outcome.',
            ],
            'ad_12' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'delayed_gratification',
                'is_reverse_scored' => false,
                'text' => 'The success or failure of my business depends mainly on my own decisions and efforts, not on luck or external circumstances.',
            ],
            'ad_13' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'delayed_gratification',
                'is_reverse_scored' => true,
                'text' => 'When my business faces difficulties, the cause is usually outside my control — such as the economy, government policy, or unfair competition.',
            ],
            'ad_14' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'financial_risk',
                'is_reverse_scored' => false,
                'text' => 'I make sure I fully understand the total cost, interest rate, and repayment terms of any loan before I sign an agreement.',
            ],
            'ad_15' => [
                'section' => 'B',
                'type' => 'likert',
                'dimension' => 'financial_risk',
                'is_reverse_scored' => true,
                'text' => 'If a business opportunity looks very profitable, I do not need to spend much time studying the risks before committing to it.',
            ],
        ];
    }
}
