from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class ProductSizeRead(BaseModel):
    size: str
    stock: int


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    sku: str
    name: str
    category: str
    description: str
    price_paise: int
    original_price_paise: int
    discount: int
    rating: float
    image: str = Field(validation_alias="image_url")
    stock: int = Field(validation_alias="available_stock")
    sizes: list[ProductSizeRead]


class ProductPage(BaseModel):
    items: list[ProductRead]
    total: int
    page: int
    page_size: int
