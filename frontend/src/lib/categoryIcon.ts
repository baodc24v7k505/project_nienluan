export function categoryIcon(name: string) {
  const value = name.toLocaleLowerCase("vi");
  if (/điện|công nghệ/.test(value)) return "fa-laptop";
  if (/thời trang|quần|áo/.test(value)) return "fa-shirt";
  if (/sách|văn phòng/.test(value)) return "fa-book-open";
  if (/gia dụng|nhà/.test(value)) return "fa-couch";
  if (/làm đẹp/.test(value)) return "fa-spa";
  if (/thể thao/.test(value)) return "fa-dumbbell";
  if (/mẹ|bé/.test(value)) return "fa-baby";
  if (/thực phẩm|ăn/.test(value)) return "fa-apple-whole";
  if (/phụ kiện/.test(value)) return "fa-bag-shopping";
  if (/đồ chơi/.test(value)) return "fa-puzzle-piece";
  return "fa-shapes";
}
