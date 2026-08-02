export const BOOK = {
  title: "The Book of Qing Yun Jian",
  description: "The philosophy of QING YUN JIAN, written from its verified foundations.",
  volume: {
    number: "Volume I",
    title: "Origins",
    chapter: {
      number: "Chapter One",
      title: "Why Qing Yun Jian Exists",
      slug: "why-qing-yun-jian-exists"
    },
    chapterTwo: {
      number: "Chapter Two",
      title: "The Mountain We Wanted to Climb",
      slug: "the-mountain-we-wanted-to-climb",
      excerpt: "The name Qing Yun Jian was never meant to describe a destination. It represents the courage to keep climbing, one meaningful step at a time.",
      status: "published"
    }
  }
} as const;

export const BOOK_CHAPTER_PATH = `/book/origins/${BOOK.volume.chapter.slug}` as const;
export const BOOK_CHAPTER_TWO_PATH = `/book/origins/${BOOK.volume.chapterTwo.slug}` as const;
