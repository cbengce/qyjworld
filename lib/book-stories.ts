/** Editorial drafts: these chapters require founder review before publication. */
export const NEW_BOOK_STORIES = [
  {
    number: "Chapter Three",
    volume: "Origins",
    slug: "the-first-address",
    title: "The First Address",
    excerpt: "A name takes on a different weight when it has a place in the world. For QING YUN JIAN, that place began at MacPherson Mall.",
    description: "A reflection on QING YUN JIAN’s first store in Singapore and what it means for an idea to become a place.",
    lead: "A name can live on a page for a long time. A store asks it to meet the world.",
    sections: [
      {
        heading: "An address, not an ending",
        paragraphs: [
          "QING YUN JIAN was founded in Singapore in 2026. Its first store is at MacPherson Mall. Those facts give the brand a place and a starting point. They do not tell the whole story of how it came to be.",
          "It is tempting to make a beginning sound inevitable. A new name, a winged horse, a phrase about ascent: on paper, the pieces can seem to fit perfectly. In a real place, the idea has to stand on its own. Someone can walk in, look at the menu and decide what tea means to them today.",
          "That is what makes a first address significant. The brand is no longer only a set of words. It becomes something people can encounter, question and return to."
        ]
      },
      {
        heading: "What the door opens onto",
        paragraphs: [
          "Our direction is a Modern Oriental tea experience. The first store gives that direction a practical setting. The language on a page may introduce us; the cup, the menu and the welcome have to make sense together when someone arrives.",
          "A first store is a beginning we can point to. It is also a reminder to keep our claims modest. We can say where QING YUN JIAN began. The more personal account of why this particular place was chosen belongs to the people who made that decision, and deserves to be told in their own words.",
          "For now, MacPherson Mall is the first address in this book: a real place for an idea that is still being lived."
        ]
      }
    ]
  },
  {
    number: "Chapter Four",
    volume: "Expression",
    slug: "tea-for-the-present",
    title: "Tea for the Present",
    excerpt: "Sparkling Tea Reimagined is an invitation to meet tea in a contemporary form, with space for curiosity and care.",
    description: "How QING YUN JIAN frames a contemporary tea experience in Singapore without claiming to speak for every tea tradition.",
    lead: "Tea has a long life beyond any one drink. Our work begins with how to offer it in the present.",
    sections: [
      {
        heading: "A new form, a familiar starting point",
        paragraphs: [
          "Sparkling Tea Reimagined is QING YUN JIAN’s brand line. It describes an approach, not a claim that tea needed to be fixed. Tea can be served in many ways. A sparkling expression is one more way to invite someone into it.",
          "The word ‘modern’ can be used carelessly, as though everything before it were out of date. That is not how we want to frame a Modern Oriental tea experience. A contemporary drink may look and feel different, while the subject remains tea.",
          "For a guest, that distinction need not be a lesson. It can begin with a simple question: does this cup make you curious to explore tea further?"
        ]
      },
      {
        heading: "Room for more than one taste",
        paragraphs: [
          "Some people approach tea through familiar flavours. Others are drawn to its aroma, its preparation, or the quiet pause of a cup. There is room for those different ways of meeting it. No single menu can represent every tradition, and no new drink can claim to replace them.",
          "QING YUN JIAN began in Singapore. Here, a contemporary expression of tea can sit alongside many other ways people already enjoy it. Our role is to offer a clear point of view and let guests decide what resonates with them.",
          "The story of a modern tea brand is still being written in its everyday choices: what it says, what it serves, and whether those two things agree."
        ]
      }
    ]
  },
  {
    number: "Chapter Five",
    volume: "Expression",
    slug: "a-winged-horse-a-simple-invitation",
    title: "A Winged Horse, a Simple Invitation",
    excerpt: "The Pegasus on our mark points upwards. The invitation behind it is gentler: keep moving, at your own pace.",
    description: "A closer look at the approved meaning of QING YUN JIAN’s Pegasus and Born to Ascend line.",
    lead: "The Pegasus is easy to recognise. What matters to us is the invitation it carries.",
    sections: [
      {
        heading: "A direction, not a finish line",
        paragraphs: [
          "The winged horse is QING YUN JIAN’s symbol. Alongside the name, it expresses upward movement, aspiration and rising towards the clouds. Born to Ascend puts that outlook into three words.",
          "A symbol can suggest direction without telling anyone how fast to travel. It can leave room for an ordinary day, a pause, or a change of mind. As an invitation, ascent can mean remaining open to what comes next. It does not need to be measured against someone else’s journey.",
          "That reading is an interpretation of the brand’s approved meaning. It is not an account of how the Pegasus was drawn or chosen; that design history still needs its own source."
        ]
      },
      {
        heading: "Keeping the symbol honest",
        paragraphs: [
          "A strong image can promise too much if the words around it are careless. We would rather let the mark remind us of a standard: speak plainly, welcome different people into tea, and leave them free to find their own meaning in a cup.",
          "The Pegasus may face the sky. The work of a tea brand happens here, in the present. Between those two ideas sits the simplest version of the invitation: look up, then take the next step in front of you."
        ]
      }
    ]
  }
] as const;

export type NewBookStory = (typeof NEW_BOOK_STORIES)[number];
export const newBookStoryPath = (story: NewBookStory) => `/book/${story.volume.toLowerCase()}/${story.slug}`;
